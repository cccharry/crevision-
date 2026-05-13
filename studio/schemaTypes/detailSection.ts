import { defineField, defineType } from 'sanity';

const keys = [
  { title: '设计理念｜Design Concept', value: 'designConcept' },
  { title: '信息架构｜Information Architecture', value: 'informationArchitecture' },
  { title: '视觉系统｜Visual System', value: 'visualSystem' },
  { title: '草图和方案设计｜Sketch & Design', value: 'sketchDesign' },
  { title: '落地复盘 & 定制说明｜Implement & Delivery', value: 'implementDelivery' },
];

export const detailSectionRow = defineType({
  name: 'detailSectionRow',
  title: '设计研发细节 · 子模块',
  type: 'object',
  fields: [
    defineField({
      name: 'sectionKey',
      title: '模块',
      type: 'string',
      options: { list: keys.map((k) => ({ title: k.title, value: k.value })), layout: 'radio' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'enabled',
      title: '启用',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'blocks',
      title: '内容块（按顺序）',
      type: 'array',
      of: [{ type: 'sectionTextBlock' }, { type: 'sectionImageBlock' }],
    }),
  ],
  preview: {
    select: { key: 'sectionKey', on: 'enabled' },
    prepare({ key, on }: { key?: string; on?: boolean }) {
      const label = keys.find((k) => k.value === key)?.title || key;
      return { title: `${on ? '✓' : '○'} ${label}` };
    },
  },
});
