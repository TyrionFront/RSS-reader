import axios from 'axios';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp
import 'regenerator-runtime';
import {
  validateUrl, separate, changeFeed, startRefreshFeeds,
} from './utils';


export const processTypedUrl = (appState, value) => {
  const { addRss, feeds } = appState;
  addRss.state = 'onInput';
  if (value.length === 0) {
    addRss.urlState = 'empty';
    return;
  }
  const [isLinkValid, warning] = validateUrl(feeds.list, value);
  addRss.urlState = isLinkValid ? 'is-valid' : `is-invalid ${warning}`;
  addRss.url = isLinkValid ? value : '';
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

  let itemsList = [];
  [...domTree.querySelectorAll('item')].forEach((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postUrl = item.querySelector('link').textContent;
    const postDescription = item.querySelector('description').textContent;
    itemsList = [{ postTitle, postUrl, postDescription }, ...itemsList];
  });
  return { title, description, itemsList };
};

const processFeed = (title, description, url, feedsList) => {
  const sameFeed = feedsList.find(feed => feed.title === title);
  if (sameFeed) {
    throw new Error(`SameFeed already exists:\n  id- ${sameFeed.feedId}\n  Title- ${sameFeed.title}`);
  }
  const feedId = _.uniqueId('rss_id');
  return {
    feedId, title, description, postsCount: 0, url,
  };
};

const processPosts = (itemsList, posts, feed) => {
  const { all } = posts;
  const { feedId } = feed;
  const newPosts = _.differenceBy(itemsList, all, 'postTitle');
  const newPostsWithId = newPosts.map((post) => {
    feed.postsCount += 1; //eslint-disable-line
    const postId = `${feedId}-post${feed.postsCount}`;
    const postWithId = { ...post, postId };
    all.push(postWithId);
    return postWithId;
  });
  return [feedId, newPostsWithId];
};

const refreshFeeds = async ([currentFeed, ...restFeeds], appState) => {
  const { posts, proxy } = appState;
  if (!currentFeed) {
    return;
  }
  const { data } = await axios.get(`https://${proxy}/${currentFeed.url}`);
  const { itemsList } = parseRss(data);
  posts.fresh = processPosts(itemsList, posts, currentFeed);
  setTimeout(() => refreshFeeds(restFeeds, appState), 0);
};

export const processFormData = async (appState) => {
  const {
    addRss, feeds, posts, proxy,
  } = appState;
  addRss.state = 'processing';
  const { data } = await axios.get(`https://${proxy}/${addRss.url}`);
  const parsedData = parseRss(data);
  addRss.state = 'processed';
  addRss.urlState = 'empty';
  const { title, description, itemsList } = parsedData;
  const newFeed = processFeed(title, description, addRss.url, feeds.list);
  feeds.list.push(newFeed);
  posts.fresh = processPosts(itemsList, posts, newFeed);

  startRefreshFeeds(appState, refreshFeeds);
};

export const removeData = (appState) => {
  appState.dataState = 'removing'; // eslint-disable-line no-param-reassign
  const { feeds, posts } = appState;
  const { activeFeedId, list, timerId } = feeds;
  clearTimeout(timerId);
  feeds.state = 'not-updating';

  const remainingPosts = posts.all.filter(item => separate(item, activeFeedId));
  const remainingFeeds = list.filter(item => separate(item, activeFeedId));
  posts.all = remainingPosts;
  feeds.list = remainingFeeds;
  changeFeed(activeFeedId, appState);

  if (remainingFeeds.length > 0) {
    startRefreshFeeds(appState, refreshFeeds);
  }
};
