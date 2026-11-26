# Source editor with a live preview, not WYSIWYG

The editor shows Markdown source on the left and a rendered HTML preview on the right. We considered a single-pane WYSIWYG editor (the Typora model) but rejected it: its cursor-to-source mapping is the most expensive part to build, and with a 100-hour budget it would consume the whole project. The source is the truth; the preview is a one-way rendering of it.

Consequence: this product does not reproduce Typora's signaturesless editing experience. Users who want that are not our audience.
