import { InsertionLog } from "https://deno.land/x/gh:marcushultman:deno-insertion-log/mod.ts";

const console = new InsertionLog(Deno.stdout);
console.log("hej 123", "1");
console.log("hej 456");
console.log("hej 789", "2");
console.replace("1", "jeh 123");
console.logAfter("1", "foo");
console.logBefore("2", "bar");
