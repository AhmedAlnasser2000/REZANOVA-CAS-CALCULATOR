export function splitTopLevelArguments(input: string): string[] | null {
  if (!input) return [];
  const parts: string[] = [];
  let start = 0;
  let roundDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '(') roundDepth += 1;
    if (char === ')') roundDepth -= 1;
    if (char === '[') squareDepth += 1;
    if (char === ']') squareDepth -= 1;
    if (char === '{') braceDepth += 1;
    if (char === '}') braceDepth -= 1;
    if (roundDepth < 0 || squareDepth < 0 || braceDepth < 0) return null;
    if (char === ',' && roundDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      const part = input.slice(start, index);
      if (!part) return null;
      parts.push(part);
      start = index + 1;
    }
  }

  if (roundDepth !== 0 || squareDepth !== 0 || braceDepth !== 0) return null;
  const finalPart = input.slice(start);
  if (!finalPart) return null;
  parts.push(finalPart);
  return parts;
}
