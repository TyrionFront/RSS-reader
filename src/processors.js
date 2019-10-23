import validator from 'validator';
import axios from 'axios';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp

export const validateUrl = (feeds, url) => {
  const sameFeed = feeds.find(feed => feed.url === url);
  return validator.isURL(url) && !sameFeed;
};

export const parseRss = (data) => {
  const domParser = new DOMParser();
  const domTree = domParser.parseFromString(data, 'application/xml');
  const parserError = domTree.querySelector('parsererror');
  if (parserError) {
    throw new Error('Wrong data format: \'application/xml\'-method can not parse it');
  }
  const title = domTree.querySelector('channel title').textContent;
  const description = domTree.querySelector('channel description').textContent;

  const itemsList = [...domTree.querySelectorAll('item')].map((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postUrl = item.querySelector('link').textContent;
    const postDescription = item.querySelector('description').textContent;
    return { postTitle, postUrl, postDescription };
  }).reverse();
  return { title, description, itemsList };
};

export const updatePosts = (itemsList, currentFeedId, posts) => {
  const { all } = posts;
  const currentFeedAllPosts = all[currentFeedId] ? all[currentFeedId] : [];
  const newPosts = _.differenceBy(itemsList, currentFeedAllPosts, 'postTitle');
  const newPostsWithId = newPosts.map((post) => {
    const postId = `${currentFeedId}-post${currentFeedAllPosts.length + 1}`;
    currentFeedAllPosts.push({ ...post, postId });
    return { ...post, postId };
  });
  all[currentFeedId] = currentFeedAllPosts;
  return [currentFeedId, newPostsWithId];
};

export const refreshFeeds = ([currentFeed, ...restFeeds], appState) => {
  const { posts } = appState;
  if (!currentFeed) {
    return;
  }
  const { feedId, url } = currentFeed;
  axios.get(`https://cors-anywhere.herokuapp.com/${url}`)
    .then(({ data }) => parseRss(data))
    .then(({ itemsList }) => updatePosts(itemsList, feedId, posts))
    .then((freshPosts) => {
      posts.fresh = freshPosts;
      setTimeout(() => refreshFeeds(restFeeds, appState), 0);
    });
};
