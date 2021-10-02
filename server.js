class HangmanGame {
  constructor(wordToGuess, maxGuessNum = 7) {
    this.solution = wordToGuess;
    this.guesses = new Set();
    this.maxGuessNum = maxGuessNum;
    this.currentGuessNum = 0;
  }
  getState() {
    return [...this.solution].map(c => (this.guesses.has(c) ? c : '_'));
  }
  makeGuess(letter, verbose = false) {
    if (!this.isGameOver()) {
      if (!this.guesses.has(letter)) {
        this.guesses.add(letter.toLowerCase());
        if (this.solution.includes(letter)) {
          if (verbose) {
            console.log(`good jerb, ${letter} is part of the word`);
          }
        } else {
          if (verbose) {
            console.log(`bad jerb, ${letter} is NOT part of the word. You have ${this.guessesRemaining()} guesses remaining`);
          }
          ++this.currentGuessNum;
        }
      } else if (verbose) {
        console.log('you already played this letter, guess again');
      }
    } else if (verbose) {
      console.log(`can\'t make any more guesses you ${this.didWin() ? 'won' : 'lost'}!`);
    }
  }
  didWin() {
    return this.getState().join('') === this.solution;
  }
  didLose() {
    return this.currentGuessNum >= this.maxGuessNum;
  }
  isGameOver() {
    return this.didWin() || this.didLose();
  }
  toString() {
    return this.getState().join('');
  }
  guessesRemaining() {
    return this.maxGuessNum - this.currentGuessNum;
  }
  getSolutionLength() {
    return this.solution.length;
  }
  getCorrectlyGuessedLetters() {
    return Array.from(this.guesses).filter(l => this.solution.includes(l));
  }
  getIncorrectlyGuessedLetters() {
    return Array.from(this.guesses).filter(l => !this.solution.includes(l));
  }
}

const tryNaiveApproach = (wordToGuess = 'test', targetWinCount = 1000, verbose = false, maxGuessNum = 7) => {
  let winCount = 0;
  let tryCount = 0;

  const getTotallyRandomLetter = playedLetters => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(l => !playedLetters.includes(l));
    return letters[Math.floor(Math.random() * letters.length)];
  };

  while (winCount < targetWinCount) {
    let guessesWeMade = [];
    const game = new HangmanGame(wordToGuess, maxGuessNum);
    while (!game.isGameOver()) {
      const randLetter = getTotallyRandomLetter(guessesWeMade);
      if (verbose) {
        console.log(`guessing it's ${randLetter}`);
      }
      guessesWeMade.push(randLetter);
      game.makeGuess(randLetter);
      if (verbose) {
        console.log(game.toString());
      }
    }
    ++tryCount;
    if (game.didWin()) {
      if (verbose) {
        console.log('Grats you win');
      }
      ++winCount;
    } else if (verbose) {
      console.log('Too bad, you lose');
    }
  }

  const accuracy = winCount / tryCount;

  console.log(
    `Naive method: took ${tryCount} tries to get ${winCount} win(s). Accuracy: ${Math.round(
      accuracy * 100
    )}%. Maximum number of guesses allowed was ${maxGuessNum}`
  );

  return accuracy;
};

const tryCleverApproach = (
  wordToGuess = 'test',
  corpus = [],
  targetWinCount = 1000,
  allowFuzziness = false,
  fuzziness = 0,
  maxGuessNum = 7,
  maxAllowedTries = targetWinCount * 10
) => {
  let winCount = 0;
  let tryCount = 0;

  const getMatchingWords = (hangmanFrame = [], excludeLetters = [], includedLetters = []) => {
    return corpus.filter(
      w =>
        (excludeLetters.length ? excludeLetters.every(l => !w.includes(l)) : true) && wordFitsHangmanFrame(w, hangmanFrame, includedLetters)
    );
  };

  const getLetterBreakdown = words => {
    return words.reduce((map, w) => {
      [...w].forEach(l => (map[l] !== undefined ? map[l]++ : (map[l] = 1)));
      return map;
    }, {});
  };

  // fuzziness is the percentage of top letters (rounded up, so minimum of 1 letter) that the letter picker can pick from.
  const getMostPopularLetter = (lettersToExclude, letterCounts, allowFuzziness = false, fuzziness = 0) => {
    const acceptableLetters = Object.keys(letterCounts).filter(k => !lettersToExclude.includes(k));
    const sortedAcceptableLetters = acceptableLetters.sort((a, b) => letterCounts[b] - letterCounts[a]);
    const topLetterCount = letterCounts[sortedAcceptableLetters[0]];
    // letters with the same count as the top letter
    const topLetters = sortedAcceptableLetters.filter(l => letterCounts[l] === topLetterCount);

    if (!allowFuzziness) {
      return topLetters[Math.floor(Math.random() * topLetters.length)];
    }

    const fuzzLength = Math.ceil(sortedAcceptableLetters.length * fuzziness);
    const fuzzedLetters = sortedAcceptableLetters.slice(0, fuzzLength);
    const fuzzedWithTopLetters = [...new Set(topLetters.concat(fuzzedLetters))];
    return fuzzedWithTopLetters[Math.floor(Math.random() * fuzzedWithTopLetters.length)];
  };

  const wordFitsHangmanFrame = (word, frame, revealedLetters = []) => {
    if (word.length !== frame.length) {
      return false;
    }
    return frame.every((letter, idx) => (letter === '_' && !revealedLetters.includes(word[idx])) || letter === word[idx]);
  };

  while (winCount < targetWinCount && tryCount < maxAllowedTries) {
    const game = new HangmanGame(wordToGuess, maxGuessNum);
    let guessesWeMade = [];
    while (!game.isGameOver()) {
      const matchingWords = getMatchingWords(game.getState(), game.getIncorrectlyGuessedLetters(), game.getCorrectlyGuessedLetters());
      const letterBreakDown = getLetterBreakdown(matchingWords);
      const guessLetter = getMostPopularLetter(guessesWeMade, letterBreakDown, allowFuzziness, fuzziness);
      game.makeGuess(guessLetter);
      guessesWeMade.push(guessLetter);
    }
    ++tryCount;
    if (game.didWin()) {
      ++winCount;
    }
  }

  const accuracy = winCount / tryCount;

  console.log(
    `Smart method: took ${tryCount} tries to get ${winCount} win(s). Accuracy: ${Math.round(accuracy * 100)}% with fuzziness ${
      allowFuzziness ? 'enabled' : 'disabled'
    } Fuzziness level was ${fuzziness}. Maximum number of guesses allowed was ${maxGuessNum}`
  );

  return accuracy;
};

// machine learning time
const runTests = (maxCount, corpus) => {
  let testCount = 0;
  let results = [];
  console.log(`Running ${maxCount} test(s) for words of length ${corpus[0].length} with different levels of fuzziness.`);
  while (testCount < maxCount) {
    const word = corpus[Math.floor(Math.random() * corpus.length)];
    console.log(`Word is: ${word.toUpperCase()}`);

    let num = 0;
    const fuzzinessValuesToTry = new Array(11).fill(1).map(() => {
      let res = num / 100;
      num = num + 10;
      return res;
    });
    const naiveResult = tryNaiveApproach(word, 100);
    const fuzzinessTestResults = new Array(11).fill(1).map((v, i) => {
      return {
        fuzziness: fuzzinessValuesToTry[i],
        naiveResult: naiveResult,
        cleverResult: tryCleverApproach(word, corpus, 100, true, fuzzinessValuesToTry[i]),
      };
    });

    if (results.length) {
      results = results.map((v, i) => {
        if (v.fuzziness !== fuzzinessTestResults[i].fuzziness) {
          console.log('this shouldnt happen');
        }
        return {
          ...v,
          naiveResult: v.naiveResult + fuzzinessTestResults[i].naiveResult,
          cleverResult: v.cleverResult + fuzzinessTestResults[i].cleverResult,
        };
      });
    } else {
      results = fuzzinessTestResults;
    }
    ++testCount;
  }

  results = results.map(v => ({
    fuzziness: v.fuzziness,
    naiveAverageResult: v.naiveResult / maxCount,
    cleverAverageResult: v.cleverResult / maxCount,
  }));
  const bestCleverResult = results.sort((a, b) => b.cleverAverageResult - a.cleverAverageResult)[0];
  console.log(`Got best results with fuzziness rate ${bestCleverResult.fuzziness}. Average success rate: ${bestCleverResult.cleverAverageResult}. Naive approach on the other hand produced accuracy ${bestCleverResult.naiveAverageResult}`);
};

const allWords = require('an-array-of-english-words');

for (let i = 2; i < 10; i++) {
  const wordsOfAcceptableLength = allWords.filter(w => w.length === i);
  runTests(10, wordsOfAcceptableLength);
}
