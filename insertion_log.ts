import { TextEncoder } from "./web/text_encoding.ts";

type Message = { id?: string; contents: string };
interface Writer {
  writeSync(p: Uint8Array): number;
}

export class InsertionLog {
  private messages = [] as Message[];
  private encoder = new TextEncoder();

  constructor(private stream: Writer) {}

  private cursorUp(n: number) {
    if (n > 0) {
      this.stream.writeSync(this.encoder.encode(`\u001B[${n.toString()}A`));
    }
  }

  private clearLine() {
    this.stream.writeSync(this.encoder.encode(`\u001B[2K\u001B[0G`));
  }

  private tailMessages(num: number) {
    return this.messages.slice(this.messages.length - num);
  }

  private rewindMessages(num: number) {
    const numLines = this.tailMessages(num).reduce(
      (sum, { contents }) => sum + 1 + (contents.match(/\n/g) || []).length,
      0,
    );
    this.cursorUp(numLines);
  }

  private printMessages(num: number) {
    for (const message of this.tailMessages(num)) {
      for (const line of message.contents.split(/\n/)) {
        this.clearLine();
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

  log(message: string, id?: string) {
    this.messages.push({ id, contents: message });
    this.printMessages(1);
  }

  append(id: string, message: string) {
    const index = this.indexOfMessage(id);
    const tail = this.messages.length - index;
    this.rewindMessages(tail);
    this.messages[index].contents += message;
    this.printMessages(tail);
  }

  flush(id: string) {
    this.messages = this.messages.slice(this.indexOfMessage(id) + 1);
  }
}
