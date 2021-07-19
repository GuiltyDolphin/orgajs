import { Char, TextKit, read as _read } from 'text-kit'
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

  const getChar = (p: number | Point = 0): Char | undefined => {
    return typeof p === 'number' ? charAt(shift(cursor, p)) : charAt(p);
  }

  const now = () => cursor

  const eat: {
    (param: RegExp, bound?: Position): { value: string; position: Position; captures: string[] } | undefined;
    (param?: 'char' | 'line' | 'whitespaces' | number | Point): { value: string; position: Position };
  } = ((param: 'char' | 'line' | 'whitespaces' | RegExp | number | Point = 'char', bound: Position = { start: now(), end: eol() }) => {
    const start = now()
    if (param === 'char') {
      cursor = shift(start, 1)
    } else if (param === 'line') {
      const lp = linePosition(cursor.line)!
      cursor = lp.end
    } else if (param === 'whitespaces') {
      const spaces = eat(/^[ \t]+/);
      if (spaces) {
        cursor = spaces.position.end;
      }
    } else if (typeof param === 'number') {
      cursor = shift(start, param)
    } else if (param instanceof RegExp) {
      const m = match(param, bound);
      if (!m) return;
      if (m) {
        cursor = m.position.end;
        return {
          value: m.captures[0],
          captures: m.captures,
          position: {
            start,
            end: cursor,
          },
        };
      }
    } else {
      if (isGreaterOrEqual(param, now())) {
        cursor = param;
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
  }) as {
    (param: RegExp, bound?: Position): { value: string; position: Position; captures: string[] } | undefined;
    (param?: 'char' | 'line' | 'whitespaces' | number | Point): { value: string; position: Position };
  };

  const eol = ((offset: number = 0) => _eol(cursor.line + offset)) as {
    (): Point; // always an end to the current line
    (offset: number): Point | undefined; // cannot guarantee line exists
  };

  const EOF = () => isGreaterOrEqual(now(), eof());

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
    shift,
  }
  return reader
}

export interface Reader {
  isStartOfLine: () => boolean;
  getChar(offset?: number | Point): Char | undefined;
  getLine: () => string;
  substring: (position: Position) => string;
  now: () => Point;
  eol(): Point;
  eol(offset: number): Point | undefined;
  EOF: () => boolean;
  eat: {
    (param: RegExp, bounds?: Position): { value: string, position: Position, captures: string[] } | undefined;
    (param?: 'char' | 'line' | 'whitespaces' | number | Point): { value: string, position: Position };
  }
  jump: (point: Point) => void;
  distance: (position: Position) => number;
  match: (pattern: RegExp, position?: Position) => {
    captures: string[],
    position: Position;
  } | undefined;
  shift: TextKit['shift'];
}
