import { defineField, defineType } from 'sanity';

export const sectionTextBlock = defineType({
  name: 'sectionTextBlock',
  title: '文字块',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: '标题（中英）',
      type: 'bilingualShort',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: '正文（中英）',
      type: 'bilingualText',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { zh: 'title.zh' },
    prepare({ zh }: { zh?: string }) {
      return { title: zh || '文字块' };
    },
  },
});

export const sectionImageBlock = defineType({
  name: 'sectionImageBlock',
  title: '图片组',
  type: 'object',
  fields: [
    defineField({
      name: 'images',
      title: '图片（按顺序）',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'caption',
              title: '说明（中英，可选）',
              type: 'bilingualShort',
            }),
          ],
        },
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    prepare: () => ({ title: '图片组' }),
  },
});
