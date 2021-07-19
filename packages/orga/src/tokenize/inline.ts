import { Point } from 'unist'
import { isGreaterOrEqual } from '../position'
import { Reader } from '../reader'
import { FootnoteReference, Link, Token, Newline } from './types'
import uri from '../uri'
import { escape } from '../utils'
import * as tk from './util';

const POST = `(?:[\\s-\\.,:!?'\\)}]|$)`
const BORDER = `[^,'"\\s]`

const MARKERS = {
  '*': 'text.bold',
  '=': 'text.verbatim',
  '/': 'text.italic',
  '+': 'text.strikeThrough',
  '_': 'text.underline',
  '~': 'text.code',
} as const;

interface Props {
  reader: Reader
  start?: Point
  end?: Point
}

export const tokenize = (props: Props, { ignoring }: { ignoring: string[] } = { ignoring: [] }): Token[] => {
  const { reader } = props;
  const { now, eat, eol, match, jump, shift, substring, getChar } = reader
  const start = props.start ?? { ...now() }
  const end = props.end ?? { ...eol() }
  jump(start)

  let cursor: Point = { ...start }

  const _tokens: Token[] = []

  /** End of the current (or `offset`) line, or end of the last available line if `offset` is too large. */
  const eolMax = (offset: number = 0): Point => {
    let currOffset = Math.max(0, offset);
    while (currOffset > 0) {
      const end = eol(currOffset);
      if (end) {
        return end;
      }
      currOffset--;
    }
    return eol();
  };

  const tokLink = (): Link | undefined => {
    const m = eat(/^\[\[([^\]]*)\](?:\[([^\]]*)\])?\]/m)
    if (!m) return undefined
    const linkInfo = uri(m.captures[1])
    if (linkInfo) {
      const { value, ...rest } = linkInfo;
      return tk.tokLink(value, { ...rest, description: m.captures[2], position: m.position });
    }
  }

  const tokFootnoteAnonOrInline = (): Token[] => {
    const tokens: Token[] = [];

    let m = eat(/^\[fn:(\w*):/);
    if (!m) return [];
    tokens.push(tk.tokFootnoteInlineBegin(m.captures[1], { position: m.position }));

    let end = match(/^\]/);
    if (end) {
      // empty body
      tokens.push(tk.tokText('', { position: { start: end.position.start, end: end.position.start, indent: end.position.indent } }));
    } else {
      tokens.push(...tokenize({ reader }, { ignoring: [']'] }));
    }

    end = eat(/^\]/);
    if (!end) return [];
    tokens.push(tk.tokFootnoteReferenceEnd({ position: end.position }));

    return tokens;
  }

  const tokFootnote = (): FootnoteReference | undefined => {
    const m = eat(/^\[fn:(\w+)\]/);
    if (m) {
      return tk.tokFootnoteReference(m.captures[1], { position: m.position });
    }
  }

  const tokStyledText = (marker: string) => (): Token[] => {
    const searchRegion = { start: now(), end: props.end ?? eolMax(1) };
    const m = match(
      RegExp(`^${escape(marker)}(${BORDER}(?:[\\S\\s]*?(?:${BORDER}))??)${escape(marker)}(?=(${POST}.*))`), searchRegion);
    if (!m) return []
    const value = m.captures[1];
    if (ignoring.some(c => value.includes(c))) {
      return [];
    }
    if (marker === '~' || marker === '=') {
      eat(m.position.end);
      return [{
        type: MARKERS[marker],
        value,
        position: m.position,
      }];
    } else if (marker === '*' || marker === '/' || marker === '+' || marker === '_') {
      const tokens: Token[] = [];
      const markerStart = eat('char');
      tokens.push({ type: 'token.complexStyleChar', char: marker, position: markerStart.position });
      const innerToks = tokenize({ reader, end: shift(m.position.end, -1) });
      tokens.push(...innerToks);
      const markerEnd = eat('char');
      tokens.push({ type: 'token.complexStyleChar', char: marker, position: markerEnd.position });
      return tokens;
    }
    return [];
  }

  const tryToTokens = (tok: () => Token[]) => {
    const save = { ...now() };
    const tokens = tok()
    if (tokens.length === 0) {
      jump(save);
      return false;
    }
    // now we treat anything between the end of the last successful
    // token(s) (or the start) and the beginning of the current tokens
    // as text
    cleanup(tokens[0].position.start);
    _tokens.push(...tokens)
    cursor = { ...now() }
    return true
  }

  const tryTo = (tok: () => Token | undefined) => {
    return tryToTokens(() => {
      const r = tok();
      return r ? [r] : [];
    });
  }

  const cleanup = (toWhere: Point) => {
    if (isGreaterOrEqual(cursor, toWhere)) return
    const position = { start: { ...cursor }, end: { ...toWhere } }
    const value = substring(position)
    _tokens.push(tk.tokText(value, { position: position }));
  }

  const tokNewline = (): Newline | undefined => {
    const newline = eat(/^\n/, { start: now(), end: shift(now(), 1) });
    if (!newline) return;
    return tk.tokNewline({ position: newline.position });
  }

  while (!isGreaterOrEqual(now(), end)) {
    const char = getChar()
    if (!char) break;

    if (ignoring.includes(char)) {
      break;
    }

    if (char === '[') {
      if (tryTo(tokLink)) continue;
      if (tryTo(tokFootnote)) continue;
      if (tryToTokens(tokFootnoteAnonOrInline)) continue;
    }

    if (char in MARKERS) {
      const pre = getChar(-1)
      if (now().column === 1 || (pre && /[\s({'"_*+\/]/.test(pre))) {
        if (tryToTokens(tokStyledText(char))) continue;
      }
    }

    if (tryTo(tokNewline)) continue;

    eat()
  }

  cleanup(now())
  return _tokens

}
