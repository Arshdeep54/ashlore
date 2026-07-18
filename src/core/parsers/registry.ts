import type { BaseParser, ParserConstructor } from './base';

class ParserRegistry {
  private parsers: Map<string, ParserConstructor> = new Map();

  register(name: string, parserClass: ParserConstructor): void {
    if (this.parsers.has(name)) {
      throw new Error(`Parser "${name}" is already registered`);
    }
    this.parsers.set(name, parserClass);
  }

  create(name: string): BaseParser {
    const ParserClass = this.parsers.get(name);
    if (!ParserClass) {
      throw new Error(
        `Unknown parser "${name}". Available: ${this.list().join(', ')}`
      );
    }
    return new ParserClass();
  }

  list(): string[] {
    return Array.from(this.parsers.keys());
  }
}

export const parserRegistry = new ParserRegistry();
