import { read as _read } from 'text-kit'
import { Point, Position } from 'unist'
import { isGreaterOrEqual } from './position';

export const read = (text: string) => {

  const {
    shift,
    substring,
    linePosition,
    match,
    eof,
    eol: _eol,
    distance,
    charAt,
  } = _read(text)

  let cursor = { line: 1, column: 1 }

  const isStartOfLine = () => cursor.column === 1

  const getChar = (p: number | Point = 0) => {
    return typeof p === 'number' ? charAt(shift(cursor, p)) : charAt(p);
  }

  const now = () => cursor

  const eat = (param: 'char' | 'line' | 'whitespaces' | RegExp | number = 'char'): {
    value: string;
    position: Position;
  } => {
    const start = now()
    if (param === 'char') {
      cursor = shift(start, 1)
    } else if (param === 'line') {
      const lp = linePosition(cursor.line)
      cursor = lp.end
    } else if (param === 'whitespaces') {
      return eat(/^[ \t]+/)
    } else if (typeof param === 'number') {
      cursor = shift(start, param)
    } else {
      const m = match(param, { start: cursor, end: eol() });
      if (m) {
        cursor = m.position.end;
      }
    }

    const position = {
      start,
      end: cursor,
    }

    return {
      value: substring(position),
      position,
    }
  }

  const eol = () => _eol(cursor.line);

  const EOF = () => {
    return isGreaterOrEqual(now(), eof());
  }

  const jump = (point: Point) => {
    cursor = point
  }

  const reader: Reader = {
    isStartOfLine,
    getChar,
    getLine: () => substring({ start: cursor }),
    substring,
    now,
    distance,
    EOF,
    eat,
    eol,
    jump,
    match: (pattern: RegExp, position: Position = { start: now(), end: eol() }) => match(pattern, position),
  }
  return reader
}

export interface Reader {
  isStartOfLine: () => boolean;
  getChar: (offset?: number | Point) => string;
  getLine: () => string;
  substring: (position: Position) => string;
  now: () => Point;
  eol: () => Point;
  EOF: () => boolean;
  eat: (param?: 'char' | 'line' | 'whitespaces' | number | RegExp) => { value: string, position: Position };
  jump: (point: Point) => void;
  distance: (position: Position) => number;
  match: (pattern: RegExp, position?: Position) => {
    captures: string[],
    position: Position;
  } | undefined;
}
