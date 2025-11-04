declare module 'opencc-js' {
  type ConverterOptions = {
    from?: string
    to?: string
  }

  type ConverterFn = (input: string) => string

  export function Converter(options?: ConverterOptions): ConverterFn
}
