var ENGLISH_WORDS_FILE_PATH = 'fixtures/google-10000-english-usa.txt';
var BOX_CHAR = '\u25A0';

var wordDictionaryArray = [];

// http://stackoverflow.com/questions/13832251/how-to-read-and-display-file-in-a-chrome-extension
var xhr = new XMLHttpRequest();
xhr.open('GET', chrome.extension.getURL(ENGLISH_WORDS_FILE_PATH), true);
xhr.onreadystatechange = function()
{
  if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200)
  {
    //... The content has been read in xhr.responseText
    console.log('ready to go');
    console.log('logging response text', xhr.responseText)
    wordDictionaryArray = xhr.responseText.split('\n');
    walkAndObserve(document);
  }
};
xhr.send();


// http://stackoverflow.com/questions/1431094/how-do-i-replace-a-character-at-a-particular-index-in-javascript
// note: it's not usually a good idea to extend base JavaScript classes but YOLO
String.prototype.replaceAt=function(index, replacement) {
  return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

// http://stackoverflow.com/questions/40818769/get-all-substrings-of-a-string-in-javascript
// function getAllSubstrings(str) {
//   var i, j, result = [];

//   for (i = 0; i < str.length; i++) {
//       for (j = i + 1; j < str.length + 1; j++) {
//           result.push(str.slice(i, j));
//       }
//   }
//   return result;
// }

// modified from getAllSubstrings from stack overflow
function getFirstMatchingSubstring(word) {
  var i, j;

  // note: must optimize to have a minimum word length
  // note: can also optimize by sorting the list of matching words by length
  for (i = 0; i < word.length; i++) {
    for (j = i + 1; j < word.length + 1; j++) {
      var subword = word.slice(i, j);
      if (subword.length > 2 && wordDictionaryArray.includes(subword)) {
        return subword;
      }
    }
  }

  return word;
}


// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function generateReplacementText(text) {
  console.log('entering generate replacement')
  // todo: handle punctuation (str.replace can have a callback)
  //       regex for punctuation: /[~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g
  // var textNoPunctuation = text.replace(/[~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
  // var words = textNoPunctuation.split(" ");
  var words = text.split(" ");
  var maxWords = getRandomInt(1, Math.min(words.length, 5));
  console.log('logging maxWords', maxWords)
  var i;
  var resWords = [];
  // greedily find the first matching word in the substring, if none,
  // use the word itself.
  // todo: refactor
  // todo: no more greedy, need to randomly choose indicies
  //       can also choose the largest words in the list.
  for (i = 0; i < maxWords; i++) {
    var word = words[i];
    var subword = getFirstMatchingSubstring(word);
    console.log('logging subword', subword);
    var resWordArray = [];
    if (word !== subword) {
      var subwordIdx = 0;
      for (var j = 0; j < word.length; j++) {
        if (subwordIdx < subword.length && word[j] === subword[subwordIdx]) {
          // if the word's character matches the subword character append and move on
          resWordArray.push(word[j]);
          subwordIdx++;
        } else {
          // if the word's character does not match the next subword character,
          // replace the character with a square
          resWordArray.push(BOX_CHAR);
        }
      }
      resWords.push(resWordArray.join(''));
    } else {
      resWords.push(word);
    }
  }

  // replace the remaining words with all boxes
  for (i; i < words.length; i++) {
    var word = words[i];

    // http://stackoverflow.com/questions/1877475/repeat-character-n-times
    resWords.push(Array(word.length).join(BOX_CHAR));
  }

  return resWords.join(" ");
}

function replaceText(element) {
  var tweets = element.getElementsByClassName('js-tweet-text tweet-text');
  for (var i = 0; i < tweets.length; i++) {
    var tweet = tweets[i];
    var sawTextNode = false;

    for (var j = 0; j < tweet.childNodes.length; j++) {
      var node = tweet.childNodes[j];

      // Sanity check for text type child node. It should be a text node.
      if (node.nodeType === 3) {
        if (!sawTextNode) {
          var text = node.nodeValue;
          var replacementText = generateReplacementText(text);
          tweet.replaceChild(document.createTextNode(replacementText), node);
          sawTextNode = true;
        } else {
          // Because I don't want this to be too complicated and mentions and
          // hashtags are not text nodes, I don't want to parse through a tree
          // to find all my words and then re-populate. Mentions and hashtags
          // will not be modified to blackout. Only the first text child node
          // will be considered.
          // Note: in the future, maybe it's best to simply blackout all hashtags
          //       and mentions for the sake of not ruining the poem
          // Note: or maybe leave mentions and have all hashtags read #poetry #deep, etc
          tweet.removeChild(node);
        }
      } else {
        // var textNode = node.childNodes[0];
        // node.replaceChild(document.createTextNode('fucking links', textNode));
        console.log('logging problematic node', node)
      }
    }
  }
}

// document.addEventListener("load", function(event) {
//   for (var i = 0; i < tweets.length; i++) {
//     var tweet = tweets[i];

//     for (var j = 0; j < tweet.childNodes.length; j++) {
//       var node = tweet.childNodes[j];

//       // Sanity check for text type child node. It should be a text node.
//       if (node.nodeType === 3) {
//         var text = node.nodeValue;
//         // var replacedText = text.replace(/handled/gi, 'FUCK YEEAAAH');
//         tweet.replaceChild(document.createTextNode('hell yes'), node);
//       }
//     }
//   }
// });

function observerCallback(mutations) {
  var i, node;

  mutations.forEach(function(mutation) {
    for (i = 0; i < mutation.addedNodes.length; i++) {
      node = mutation.addedNodes[i];

      if (node.getElementsByClassName) {
        replaceText(node)
      }
    }
  });
}

// https://github.com/ericwbailey/millennials-to-snake-people/blob/master/Source/content_script.js
function walkAndObserve(doc) {
  var docTitle = doc.getElementsByTagName('title')[0],
    observerConfig = {
      characterData: true,
      childList: true,
      subtree: true
    },
    bodyObserver, titleObserver;

  // Do the initial text replacements in the document body
  replaceText(doc);

  // Observe the body so that we replace text in any added/modified nodes
  bodyObserver = new MutationObserver(observerCallback);
  bodyObserver.observe(doc.body, observerConfig);
}

//replaceText(document);
// walkAndObserve(document);