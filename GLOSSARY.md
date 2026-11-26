# Markdown Editor

The personal writing tool built around local Markdown files: a source editor with a live preview, no account and no cloud.

## Language

### Source and display

**File**:
A Markdown document that lives on disk as a `.md` file; the persistent source of truth for a piece of writing.
_Avoid_: Document, note, page_

**Buffer**:
The in-memory, editable copy of a File shown in the source editor; it may contain changes not yet written to disk.
_Avoid_: Document, draft, tab_

**Entry**:
An item in the sidebar file tree: a path to a File plus its display metadata.
_Avoid_: File tree node, folder item_

**RenderedHTML**:
The one-way result of rendering Markdown source into HTML for display; it is never edited or written back.
_Avoid_: Preview, output_

**PreviewPane**:
The panel that displays RenderedHTML alongside the source editor.
_Avoid_: Preview (alone), viewer_

### Images

**ImageSyntax**:
A Markdown image reference of the form `![](path)` embedded in a File's source.
_Avoid_: Image tag, picture_

**Asset**:
A binary resource file stored in the `_assets/` directory next to the File it belongs to.
_Avoid_: Attachment, image file_

**RenderedImage**:
The image element shown inside RenderedHTML, produced from an ImageSyntax or Asset.
_Avoid_: Image (alone), picture_
