import validator from 'validator';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp

export const validateUrl = (feeds, url) => {
  const sameFeed = feeds.find(feed => feed.url === url);
  return validator.isURL(url) && !sameFeed;
};

export const parseRss = (data, feeds) => {
  const domParser = new DOMParser();
  const domTree = domParser.parseFromString(data, 'application/xml');
  const parserError = domTree.querySelector('parsererror');
  if (parserError) {
    throw new Error('Wrong data format: \'application/xml\'-method can not parse it');
  }
  const title = domTree.querySelector('channel title').textContent;
  const sameFeed = feeds.find(feed => feed.title === title);
  if (sameFeed) {
    throw new Error(`SameFeed already exists:\n  id- ${sameFeed.feedId}\n  Title- ${sameFeed.title}`);
  }
  const description = domTree.querySelector('channel description').textContent;

  const postsList = [...domTree.querySelectorAll('item')].map((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postUrl = item.querySelector('link').textContent;
    const postDescription = item.querySelector('description').textContent;
    return { postTitle, postUrl, postDescription };
  }).reverse();
  return { title, description, postsList };
};

export const updatePosts = (postsList, currentFeedId, appState) => {
  const { posts } = appState;
  const { all } = posts;
  const currentFeedAllPosts = all[currentFeedId] ? all[currentFeedId] : [];
  const newPosts = _.differenceBy(postsList, currentFeedAllPosts, 'postTitle');
  const newPostsWithId = newPosts.map((post, i) => {
    currentFeedAllPosts.push(post);
    const postId = `${currentFeedId}-post${i + 1}`;
    return { ...post, postId };
  });
  all[currentFeedId] = currentFeedAllPosts;
  posts.fresh = newPostsWithId;
};
