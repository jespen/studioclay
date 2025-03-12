declare namespace PDFKit {
  interface PDFDocument extends NodeJS.EventEmitter {
    page: {
      width: number;
      height: number;
    };
    info: Record<string, any>;
    fontSize(size: number): this;
    font(font: string): this;
    text(text: string, x?: number, y?: number, options?: any): this;
    moveDown(lines?: number): this;
    lineWidth(width: number): this;
    rect(x: number, y: number, w: number, h: number): this;
    stroke(): this;
    on(event: string, listener: Function): this;
    end(): void;
  }
} 