import debug from './debug'
import { GreaterBlock } from '../../types';

import {
  block,
  greaterBlock,
  paragraph,
  testParse,
  text,
} from './util';

describe('Parse Block', () => {
  it('works', () => {
    const content = `
* headline one
#+BEGIN_SRC javascript
const string = 'hello world'
console.log(string)
#+END_SRC
`
    // debug(content)
  })

  function testBlock(testName: string, toParse: string, ...expected: Parameters<typeof block>) {
    return testParse(testName, toParse, [block(...expected)]);
  }

  function testGreaterBlock(testName: string, toParse: string, ...expected: Parameters<typeof greaterBlock>) {
    return testParse(testName, toParse, [greaterBlock(...expected)]);
  }

  describe('unclosed block is treated as text', () => {
    testParse('basic',
      '#+BEGIN_FOO',
      [paragraph([text('#+BEGIN_FOO')])]);

    testParse('with PARAMETERS',
      '#+BEGIN_FOO P',
      [paragraph([text('#+BEGIN_FOO P')])]);

    testParse('case is respected',
      '#+BEGiN_FoO P pP',
      [paragraph([text('#+BEGiN_FoO P pP')])]);

    testParse('spacing is respected',
      '#+BEGIN_FOO  P   h',
      [paragraph([text('#+BEGIN_FOO  P   h')])]);
  });

  describe('end block without start is treated as text', () => {
    testParse('basic',
      '#+END_FOO',
      [paragraph([text('#+END_FOO')])]);

    testParse('case is preserved',
      '#+EnD_FoO',
      [paragraph([text('#+EnD_FoO')])]);
  });

  describe('greater blocks', () => {
    for (const blockTy of ['QUOTE', 'CENTER'] as GreaterBlock['name'][]) {
      describe(`${blockTy} block`, () => {
        const otherBlock = blockTy === 'QUOTE' ? 'CENTER' : 'QUOTE';
        testGreaterBlock('open and close',
          `#+BEGIN_${blockTy}
#+END_${blockTy}`, blockTy, []);

        testGreaterBlock('greater blocks can appear in greater block content',
          `#+BEGIN_${blockTy}
#+BEGIN_${otherBlock}
You can nest other greater blocks inside a greater block.
#+END_${otherBlock}

And more text.
#+END_${blockTy}`, blockTy, [greaterBlock(otherBlock, [paragraph([text('You can nest other greater blocks inside a greater block.')])]), paragraph([text('And more text.')])]);

        testGreaterBlock('you can nest greater blocks of the same type (one nesting)',
          `#+BEGIN_${blockTy}
#+BEGIN_${blockTy}
You can nest the same block.
#+END_${blockTy}

And more text.
#+END_${blockTy}`, blockTy, [greaterBlock(blockTy, [paragraph([text('You can nest the same block.')])]), paragraph([text('And more text.')])]);

        testGreaterBlock('with params',
          `#+BEGIN_${blockTy} param1 param2
This is.
Some text.
#+END_${blockTy}`, blockTy, [paragraph([text('This is.'), text(' '), text('Some text.')])], { params: ['param1', 'param2'] });
      });
    }
  });

  describe('block elements', () => {
    testBlock('export block with DATA being one word', '#+BEGIN_EXPORT okay\n#+END_EXPORT', 'EXPORT', '', { params: ['okay'] });

    for (const blockTy of ['COMMENT', 'EXAMPLE', 'EXPORT', 'SRC']) {
      testBlock(`CONTENTS not parsed in "${blockTy}" block`, `#+BEGIN_${blockTy} p\n*some data*\n#+END_${blockTy}`, blockTy, '*some data*', { params: ['p'] });
    }
  });
});
