type Message = { id: string | null; contents: string };
interface Writer {
  writeSync(p: Uint8Array): number;
}

function newLines(message: string) {
  return 1 + (message.match(/\n/g) || []).length;
}

export default class InsertionLog {
  private messages = [] as Message[];
  private encoder = new TextEncoder();

  constructor(private stream: Writer) {}

  private cursorUp(n: number) {
    if (n > 0) {
      this.stream.writeSync(this.encoder.encode(`\u001B[${n.toString()}A`));
    }
  }

  private deleteLineAndGoToBeginning() {
    this.stream.writeSync(this.encoder.encode(`\u001B[2K\u001B[0G`));
  }

  private getLastMessages(num: number) {
    return this.messages.slice(this.messages.length - num);
  }

  private rewindMessages(num: number) {
    const numLines = this.getLastMessages(num).reduce(
      (sum, message) => sum + newLines(message.contents),
      0,
    );
    this.cursorUp(numLines);
  }

  private printMessages(num: number) {
    for (const message of this.getLastMessages(num)) {
      for (const line of message.contents.split(/\n/)) {
        this.deleteLineAndGoToBeginning();
        this.stream.writeSync(this.encoder.encode(`${line}\n`));
      }
    }
  }

  private indexOfMessage(id: string) {
    for (let i = this.messages.length - 1; i >= 0; --i) {
      if (this.messages[i].id === id) {
        return i;
      }
    }
    throw new Error(`No message for id: ${id}`);
  }

  private logAt(index: number, message: string, id?: string) {
    this.messages.splice(index, 0, { id: id ?? null, contents: message });
    const tail = this.messages.length - index;
    this.rewindMessages(tail - 1);
    this.printMessages(tail);
  }

  log(message: string, id?: string) {
    this.messages.push({ id: id ?? null, contents: message });
    this.printMessages(1);
  }

  logAfter(afterId: string, message: string, id?: string) {
    this.logAt(this.indexOfMessage(afterId) + 1, message, id);
  }

  logBefore(beforeId: string, message: string, id?: string) {
    this.logAt(this.indexOfMessage(beforeId), message, id);
  }

  replace(id: string, message: string) {
    const index = this.indexOfMessage(id);
    if (newLines(message) !== newLines(this.messages[index].contents)) {
      throw new Error(
        'Not allowed to repace with a different number of new lines',
      );
    }
    this.messages[index].contents = message;
    const tail = this.messages.length - index;
    this.rewindMessages(tail);
    this.printMessages(tail);
  }
}
