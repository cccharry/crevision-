import groq from 'groq';

/** 列表页：按 projectsListOrder 排序 */
export const projectsListQuery = groq`
  *[_type == "project"] | order(projectsListOrder asc, _updatedAt desc) {
    _id,
    "slug": slug.current,
    title,
    summary,
    heroImage,
    services,
    showOnHomeCarousel,
    homeCarouselOrder,
    projectsListOrder
  }
`;

/** 首页轮播：仅勾选的，按 homeCarouselOrder */
export const homeCarouselQuery = groq`
  *[_type == "project" && showOnHomeCarousel == true] | order(homeCarouselOrder asc) {
    _id,
    "slug": slug.current,
    title,
    summary,
    heroImage
  }
`;

/** 详情页 */
export const projectBySlugQuery = groq`
  *[_type == "project" && slug.current == $slug][0] {
    ...,
    "slug": slug.current
  }
`;
