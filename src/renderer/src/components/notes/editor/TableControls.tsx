import type { Editor } from '@tiptap/react'
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpDown,
  ArrowUpToLine,
  ArrowUpZA,
  Combine,
  Copy,
  CopyPlus,
  Eraser,
  Split,
  SquareDashedMousePointer,
  Table2,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Trash2
} from 'lucide-react'
import type React from 'react'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '../../ui/context-menu'
import { toast } from '../../ui/toast'
import {
  type ColumnAlign,
  clearCells,
  copyTable,
  duplicateRows,
  getTableMenuState,
  moveColumn,
  moveRow,
  selectionTablePos,
  selectTable,
  setColumnAlign,
  sortByColumn
} from './tableActions'

export const TableControls: React.FC<{ editor: Editor }> = ({ editor }) => (
  <ContextMenuContent className="w-56">
    <TableMenuItems editor={editor} />
  </ContextMenuContent>
)

const SECTION_LABEL =
  'pb-0.5 pt-1 text-2xs font-bold uppercase tracking-wider text-muted-foreground/60'
const ICON = 'text-muted-foreground'

const ALIGNS: { value: ColumnAlign; label: string; Icon: typeof TextAlignStart }[] = [
  { value: 'left', label: 'Left', Icon: TextAlignStart },
  { value: 'center', label: 'Center', Icon: TextAlignCenter },
  { value: 'right', label: 'Right', Icon: TextAlignEnd }
]

const TableMenuItems: React.FC<{ editor: Editor }> = ({ editor }) => {
  const s = getTableMenuState(editor)
  const chain = () => editor.chain().focus()
  const AlignIcon = ALIGNS.find((a) => a.value === s.align)?.Icon ?? TextAlignStart

  const handleCopy = async (): Promise<void> => {
    const pos = selectionTablePos(editor.state)
    try {
      if (pos !== null && (await copyTable(editor, pos))) toast.success('Table copied')
    } catch (e) {
      toast.error('Could not copy table', {
        description: e instanceof Error ? e.message : String(e)
      })
    }
  }

  return (
    <>
      <ContextMenuLabel className="flex items-center gap-1.5 text-muted-foreground">
        <Table2 className="size-3.5 text-notes" />
        Table
      </ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuLabel className={SECTION_LABEL}>Rows</ContextMenuLabel>
      <ContextMenuItem onClick={() => chain().addRowBefore().run()}>
        <ArrowUpToLine className={ICON} />
        Insert row above
      </ContextMenuItem>
      <ContextMenuItem onClick={() => chain().addRowAfter().run()}>
        <ArrowDownToLine className={ICON} />
        Insert row below
      </ContextMenuItem>
      <ContextMenuItem onClick={() => duplicateRows(editor)} disabled={!s.canDuplicateRow}>
        <CopyPlus className={ICON} />
        Duplicate row
      </ContextMenuItem>
      <ContextMenuItem onClick={() => moveRow(editor, -1)} disabled={!s.canMoveRowUp}>
        <ArrowUp className={ICON} />
        Move row up
      </ContextMenuItem>
      <ContextMenuItem onClick={() => moveRow(editor, 1)} disabled={!s.canMoveRowDown}>
        <ArrowDown className={ICON} />
        Move row down
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => chain().deleteRow().run()}
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <Trash2 className="text-destructive" />
        Delete row
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuLabel className={SECTION_LABEL}>Columns</ContextMenuLabel>
      <ContextMenuItem onClick={() => chain().addColumnBefore().run()}>
        <ArrowLeftToLine className={ICON} />
        Insert column left
      </ContextMenuItem>
      <ContextMenuItem onClick={() => chain().addColumnAfter().run()}>
        <ArrowRightToLine className={ICON} />
        Insert column right
      </ContextMenuItem>
      <ContextMenuItem onClick={() => moveColumn(editor, -1)} disabled={!s.canMoveColumnLeft}>
        <ArrowLeft className={ICON} />
        Move column left
      </ContextMenuItem>
      <ContextMenuItem onClick={() => moveColumn(editor, 1)} disabled={!s.canMoveColumnRight}>
        <ArrowRight className={ICON} />
        Move column right
      </ContextMenuItem>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <AlignIcon className={ICON} />
          Align column
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-36">
          {ALIGNS.map(({ value, label, Icon }) => (
            <ContextMenuItem key={value} onClick={() => setColumnAlign(editor, value)}>
              <Icon className={ICON} />
              {label}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger disabled={!s.canSort}>
          <ArrowUpDown className={ICON} />
          Sort by column
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-40">
          <ContextMenuItem onClick={() => sortByColumn(editor, 1)}>
            <ArrowDownAZ className={ICON} />
            Sort ascending
          </ContextMenuItem>
          <ContextMenuItem onClick={() => sortByColumn(editor, -1)}>
            <ArrowUpZA className={ICON} />
            Sort descending
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuItem
        onClick={() => chain().deleteColumn().run()}
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <Trash2 className="text-destructive" />
        Delete column
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuLabel className={SECTION_LABEL}>Cells</ContextMenuLabel>
      <ContextMenuItem onClick={() => chain().mergeCells().run()} disabled={!s.canMerge}>
        <Combine className={ICON} />
        Merge cells
      </ContextMenuItem>
      <ContextMenuItem onClick={() => chain().splitCell().run()} disabled={!s.canSplit}>
        <Split className={ICON} />
        Split cell
      </ContextMenuItem>
      <ContextMenuItem onClick={() => clearCells(editor)}>
        <Eraser className={ICON} />
        Clear content
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleCopy}>
        <Copy className={ICON} />
        Copy table
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          const pos = selectionTablePos(editor.state)
          if (pos !== null) selectTable(editor, pos)
        }}
      >
        <SquareDashedMousePointer className={ICON} />
        Select table
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => chain().deleteTable().run()}
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <Trash2 className="text-destructive" />
        Delete table
      </ContextMenuItem>
    </>
  )
}
