import { Position } from 'unist'
import { after, before, isEmpty } from './position'
import { Child, Node, Parent } from './types'

const clone = ({ start, end }: Position): Position => ({
  start: { ...start },
  end: { ...end },
})

const adjustPosition = (parent: Parent & Partial<Child>) => (child: Node): void => {
  let dirty = false

  if (!child.position) return
  const cp = clone(child.position);
  if (parent.position) {
    parent.position = clone(parent.position);
    const belowLowerBound = before(parent.position.start)
    const aboveUpperBound = after(parent.position.end)

    if (isEmpty(parent.position)) {
      parent.position = cp;
      dirty = true
    } else if (belowLowerBound(cp.start)) {
      parent.position.start = cp.start;
      dirty = true
    } else if (aboveUpperBound(cp.end)) {
      parent.position.end = cp.end;
      dirty = true
    }
  } else {
    parent.position = cp;
    dirty = true
  }

  if ('parent' in parent && parent.parent && dirty) {
    adjustPosition(parent.parent)(parent)
  }
}

export const pushMany = <P extends Parent>(p: P) => (n: P['children']): P => {
  n.forEach(n => push(p)(n));
  return p;
}

export const push = <P extends Parent>(p: P) => (n: P['children'][number]): P => {
  if (!n) return p
  adjustPosition(p)(n)
  if (n) {
    n.parent = p
  }
  p.children.push(n)
  return p
}

export const setChildren = <P extends Parent>(p: P) => (ns: [Node, ...Node[]] & P['children']): P => {
  adjustPosition(p)(ns[ns.length - 1])
  for (const n of ns) {
    n.parent = p;
  }
  p.children = ns;
  return p
}

export const map = <T extends Node & Partial<Parent>>(transform: (n: Node & Partial<Parent>) => T) => (node: Node & Partial<Parent>): T => {

  const result = {
    ...transform(node),
  }

  if ('children' in node && node.children) {
    result.children = node.children.map(map(transform))
  }
  return result
}

interface DumpContext {
  text: string;
  lines?: string[];
  indent?: number;
}

// export const dump = (text: string, indent: number = 0) => <T extends Parent>(tree: T): string[] => {
//   const { substring } = locate(text)
//   const spaces = '  '.repeat(indent)
//   const line = `${spaces}- ${tree.type}`
//   const rest = tree.children.flatMap(dump(text, indent + 1))
//   return [line].concat(rest)
// }

export const level = (node: Child): number => {
  let count = 0
  let parent = node.parent
  while (parent && 'parent' in parent) {
    count += 1
    parent = parent.parent
  }
  return count
}
