

export function needsGroupingLatex(value: string) {
  return /[+-]/u.test(value.replace(/^-/, '')) || value.includes('\\frac') || value.includes(',');
}

export function groupedLatex(value: string) {
  if (/^\\left\(.*\\right\)$/u.test(value) || /^[a-zA-Z0-9]+$/u.test(value) || value === 'i' || value === '-i') {
    return value;
  }
  return needsGroupingLatex(value) ? `\\left(${value}\\right)` : value;
}

export function isZeroLatex(value: string) {
  return value === '0';
}

export function isOneLatex(value: string) {
  return value === '1';
}

export function isNegativeOneLatex(value: string) {
  return value === '-1';
}

export function negateLatex(value: string) {
  if (isZeroLatex(value)) {
    return '0';
  }
  if (value.startsWith('-') && !value.startsWith('-\\')) {
    return value.slice(1);
  }
  return `-${groupedLatex(value)}`;
}

export function addLatex(left: string, right: string) {
  if (isZeroLatex(left)) {
    return right;
  }
  if (isZeroLatex(right)) {
    return left;
  }
  if (right.startsWith('-')) {
    return `${left}-${groupedLatex(right.slice(1))}`;
  }
  return `${left}+${right}`;
}

export function subtractLatex(left: string, right: string) {
  if (isZeroLatex(right)) {
    return left;
  }
  if (isZeroLatex(left)) {
    return negateLatex(right);
  }
  if (right.startsWith('-')) {
    return addLatex(left, right.slice(1));
  }
  return `${left}-${groupedLatex(right)}`;
}

export function multiplyLatex(left: string, right: string) {
  if (isZeroLatex(left) || isZeroLatex(right)) {
    return '0';
  }
  if (isOneLatex(left)) {
    return right;
  }
  if (isOneLatex(right)) {
    return left;
  }
  if (isNegativeOneLatex(left)) {
    return negateLatex(right);
  }
  if (isNegativeOneLatex(right)) {
    return negateLatex(left);
  }
  const numericLeft = left.match(/^(-?\d+)$/u);
  const rightPi = right.match(/^(-?\d+)\\pi(.*)$/u);
  if (numericLeft && rightPi) {
    return `${Number(numericLeft[1]) * Number(rightPi[1])}\\pi${rightPi[2]}`;
  }
  const numericRight = right.match(/^(-?\d+)$/u);
  const leftPi = left.match(/^(-?\d+)\\pi(.*)$/u);
  if (numericRight && leftPi) {
    return `${Number(numericRight[1]) * Number(leftPi[1])}\\pi${leftPi[2]}`;
  }
  if (/^-?\d+(?:\/\d+)?$/u.test(right) && !/^-?\d+(?:\/\d+)?$/u.test(left)) {
    return `${right}${groupedLatex(left)}`;
  }
  return `${groupedLatex(left)}${groupedLatex(right)}`;
}

export function divideLatex(numerator: string, denominator: string) {
  if (isOneLatex(denominator)) {
    return numerator;
  }
  if (isNegativeOneLatex(denominator)) {
    return negateLatex(numerator);
  }
  return `\\frac{${numerator}}{${denominator}}`;
}
