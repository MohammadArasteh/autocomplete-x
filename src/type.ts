type TAutoCompleteItem<TData> = {
  label: string;
  value: Partial<TData>;
};
type TAutoCompleteItemRule<TData> = {
  rule: string | ((item: TAutoCompleteItem<TData>) => boolean);
  classNames: Array<string>;
};
type TAutoCompleteDataSource<TData> = (
  query: string,
  page: number
) => Promise<Array<TAutoCompleteItem<TData>>>;
interface IAutoCompleteParameters<TData> {
  placeholder?: string;
  datasource: TAutoCompleteDataSource<TData>;
  onSelect?: (item: Partial<TData> | null) => void;
  nullable?: boolean;
  showOnFocus?: boolean;
  lazyFetch?: boolean;
  closeAfterSelect?: boolean;
  className?: string;
  classRules?: Array<TAutoCompleteItemRule<TData>>;
  currentValue?: TAutoCompleteItem<TData> | null;
  render?: (item: Partial<TData>) => HTMLElement;
}

export type {
  IAutoCompleteParameters,
  TAutoCompleteDataSource,
  TAutoCompleteItem,
  TAutoCompleteItemRule,
};
