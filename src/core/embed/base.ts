export abstract class BaseEmbeddingProvider {
  abstract readonly name: string;
  abstract readonly dimensions: number;
  abstract embed(texts: string[]): Promise<number[][]>;
  abstract embedSingle(text: string): Promise<number[]>;
}
