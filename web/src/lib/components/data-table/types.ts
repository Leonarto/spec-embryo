import type { Snippet } from 'svelte';
export const HEADER_ROW = '__header__';
export interface FocusedCell { rowId: string; columnKey: string }
export interface ColumnDef<Row> {
  key: string; label: string; headerLabel?: string; kind?: 'selection'|'identity'|'text';
  textValue: (row:Row)=>string; href?: (row:Row)=>string; cell?: Snippet<[Row]>;
  symbol?: (row:Row)=>string; tone?: (row:Row)=>'neutral'|'accent'|'info'|'warning'|'danger';
  sortKey?: string; align?: 'left'|'right'; mono?: boolean;
  defaultWidth: number; minWidth: number; maxWidth: number;
  flex?: boolean; locked?: boolean; defaultVisible?: boolean; copyable?: boolean;
}
export interface ColumnPreference { key:string; width:number; visible:boolean; sizing?:'auto'|'explicit' }
export type RenderedColumn<Row> = ColumnDef<Row> & {width:number};
export interface TablePreferences { version:1; density:'compact'|'comfortable'; columns:ColumnPreference[] }
export interface TableSort { key:string; direction:'asc'|'desc' }
