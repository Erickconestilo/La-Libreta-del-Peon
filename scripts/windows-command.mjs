export const quoteWindowsCommandArg = (value) => {
  if (!/[\s&|<>^"]/.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, "$1$1\\\"").replace(/(\\*)$/g, "$1$1")}"`;
};

export const buildWindowsCommandLine = (command, args = []) => [command, ...args]
  .map(quoteWindowsCommandArg)
  .join(" ");
