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
    // console.log('logging response text', xhr.responseText)
    wordDictionaryArray = xhr.responseText.split('\n');
    walkAndObserve(document);
  }
};
xhr.send();


// http://stackoverflow.com/questions/12048621/get-all-combinations-for-a-string
// Using combinations (don't want permutations, must maintain order of letters)
// Note: this algorithm may not be perfect, but it does the trick for now
function getFirstMatchingCombination(word) {

  // Return null if no combination is a word, else return that word
  function loop(start, depth, prefix) {
    var next;
    for (var i = start; i < word.length; i++) {
      next = prefix + word[i];
      // Don't go too deep because of performance issues
      if (depth > 0 && depth < 8) {
        return loop(i + 1, depth - 1, next);
      } 
      if(next.length > 3 && wordDictionaryArray.includes(next)) {
        return next;
      }
    }
    // no good candidate word was found
    return null;
  }

  for (var i = 0; i < word.length; i++) {
    var subword = loop(0, i, '');
    if (subword) {
      return subword;
    }
  }

  // No suitable subword was found so return the original word
  return word;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function createBlackoutWord(word) {
  var subword = getFirstMatchingCombination(word);
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
    return resWordArray.join('');
  } else {
    return word;
  }
}

function getWordIndices(numWords, totalWords) {
  // Indicies will be modified
  var indices = Array.from(Array(totalWords).keys());
  var resultIndices = []
  for (var i = 0; i < numWords; i++) {
    // Get a random index from the remaining indicies
    var randInt = getRandomInt(0, indices.length - 1);
    resultIndices.push(indices.splice(randInt, 1)[0]);
  }
  // Unsorted array of indices
  return resultIndices;
}

function generateReplacementText(text) {
  // todo: handle punctuation (str.replace can have a callback)
  //       regex for punctuation: /[~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g
  // var textNoPunctuation = text.replace(/[~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
  // var words = textNoPunctuation.split(" ");
  var words = text.split(" ");
  var maxWords = getRandomInt(1, Math.min(words.length, 5));
  // Select random words to modify
  var selectedWordIndices = getWordIndices(maxWords, words.length);
  var resWords = [];
  // greedily find the first matching word in the combination, if none,
  // use the word itself.
  // todo: no more greedy, need to randomly choose indices
  //       can also choose the largest words in the list.
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (selectedWordIndices.includes(i)) {
      resWords.push(createBlackoutWord(word));
    } else {
      // http://stackoverflow.com/questions/1877475/repeat-character-n-times
      resWords.push(Array(word.length).join(BOX_CHAR));
    }
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
        // node.replaceChild(document.createTextNode('ugh links', textNode));
        // console.log('logging problematic node', node)
      }
    }
  }
}

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
