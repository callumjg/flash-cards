import tags from "./tags";
export default {
  1: {
    categoryId: 1,
    tags: [tags[1], tags[2]],
    name: "category1"
  },
  2: {
    categoryId: 2,
    tags: [tags[2], tags[3]],
    name: "category2"
  },
  3: {
    categoryId: 3,
    parentId: 1,
    tags: [tags[3]],
    name: "category3"
  },
  4: {
    categoryId: 4,
    parentId: 3,
    tags: [],
    name: "category4"
  },
  5: {
    categoryId: 5,
    tags: [],
    name: "category5"
  }
};
