/**
 * TipTap Extensions for Pages
 *
 * Custom extensions that enhance the page editor:
 * - SlashCommands: "/" trigger for quick actions
 * - DiagramNode: Embed Excalidraw diagrams
 */

export { SlashCommands, getDefaultCommands, type SlashCommandItem } from './slash-commands';
export { DiagramNode, type DiagramNodeAttributes } from './diagram-node';
export { createSuggestionConfig } from './suggestion-config';
