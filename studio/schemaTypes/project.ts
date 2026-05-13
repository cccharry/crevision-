import { defineField, defineType } from 'sanity';

export const project = defineType({
  name: 'project',
  title: '案例 Project',
  type: 'document',
  groups: [
    { name: 'basics', title: '基础信息（含项目介绍）' },
    { name: 'details', title: '设计研发细节（可选模块）' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: '项目标题（中英）',
      type: 'bilingualShort',
      group: 'basics',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL 片段（唯一）',
      type: 'slug',
      group: 'basics',
      options: { source: 'title.en', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'introduction',
      title: '项目介绍（中英）',
      description:
        '信息架构中列为项目第一条正文信息；与列表短描述、项目背景不同',
      type: 'bilingualText',
      group: 'basics',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: '列表 / 首页轮播 · 简短描述（中英）',
      description: '用于 Projects 列表与首页轮播；较短，不同于「项目介绍」',
      type: 'bilingualText',
      group: 'basics',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: '项目头图',
      description: 'Detail 顶栏、首页轮播、列表（前台可统一裁切）',
      type: 'image',
      group: 'basics',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'background',
      title: '项目背景（必选）',
      description: '案例背景叙事；填写顺序在头图之后，与 IA「基础信息」一致',
      type: 'bilingualText',
      group: 'basics',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'services',
      title: '服务内容（标签）',
      type: 'array',
      group: 'basics',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'showOnHomeCarousel',
      title: '在首页轮播展示',
      type: 'boolean',
      group: 'basics',
      initialValue: false,
    }),
    defineField({
      name: 'homeCarouselOrder',
      title: '首页轮播排序（越小越靠前）',
      type: 'number',
      group: 'basics',
      initialValue: 0,
    }),
    defineField({
      name: 'projectsListOrder',
      title: 'Projects 列表排序（越小越靠前）',
      type: 'number',
      group: 'basics',
      initialValue: 0,
    }),
    defineField({
      name: 'detailSections',
      title: '设计研发细节 · 可选模块',
      description: '为每个子模块添加一行；关闭「启用」则前台不展示',
      type: 'array',
      group: 'details',
      of: [{ type: 'detailSectionRow' }],
    }),
  ],
  preview: {
    select: { zh: 'title.zh', en: 'title.en', introZh: 'introduction.zh' },
    prepare({
      zh,
      en,
      introZh,
    }: {
      zh?: string;
      en?: string;
      introZh?: string;
    }) {
      const title = zh || en || '未命名案例';
      const subtitle = introZh?.trim()
        ? introZh.slice(0, 56) + (introZh.length > 56 ? '…' : '')
        : undefined;
      return { title, subtitle };
    },
  },
});
