import type { SchemaTypeDefinition } from 'sanity';
import { bilingualShort, bilingualText } from './bilingual';
import { sectionImageBlock, sectionTextBlock } from './detailBlocks';
import { detailSectionRow } from './detailSection';
import { project } from './project';

export const schemaTypes: SchemaTypeDefinition[] = [
  bilingualShort,
  bilingualText,
  sectionTextBlock,
  sectionImageBlock,
  detailSectionRow,
  project,
];
