import { zonedTimeToUtc } from 'date-fns-tz';
import { read } from '../reader';
import { Timestamp } from './types';

export const parse = (
  input: string,
  { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = {},
): Timestamp | undefined => {

  const { eat, getChar } = read(input)

  eat('whitespaces')
  const timestamp = () => {

    // opening
    const opening = eat(/[<[]/g)?.value;
    if (!opening) return;
    const active = opening === '<'

    // date
    const _date = eat(/^\d{4}-\d{2}-\d{2}/);
    if (!_date) return;
    let date = _date.value;

    eat('whitespaces')

    let end: string | undefined

    // day
    const _day = eat(/^[a-zA-Z]+/);
    eat('whitespaces')

    // time
    const time = eat(/^(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?/)
    if (time) {
      date = `${_date.value} ${time.captures[1]}`
      if (time.captures[2]) {
        end = `${_date.value} ${time.captures[2]}`
      }
    }

    // closing
    const closing = getChar()
    if ((opening === '[' && closing === ']') ||
      (opening === '<' && closing === '>')) {

      eat('char')
      return {
        date: zonedTimeToUtc(date, timezone),
        end: end ? zonedTimeToUtc(end, timezone) : undefined,
      }
    }

    // opening closing does not match

  }


  const ts = timestamp()
  if (!ts) return

  if (!ts.end) {
    const doubleDash = eat(/--/)?.value ?? '';
    if (doubleDash.length > 0) {
      const end = timestamp()
      if (end) {
        ts.end = end.date
      }
    }
  }

  return ts
}
