import axios from 'axios';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp
import 'regenerator-runtime';
import {
  validateUrl, compare, changeFeed, startRefreshFeeds,
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
  const newPosts = _.differenceBy(itemsList, all, 'postTitle');
  if (newPosts.length === 0) {
    return null;
  }
  const { feedId } = feed;
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
  try {
    const { data } = await axios.get(`${proxy.allOrigins}${currentFeed.url}`);
    const { itemsList } = parseRss(data.contents);
    const processedData = processPosts(itemsList, posts, currentFeed);
    if (processedData) {
      posts.fresh = processedData;
    }
  } catch (error) {
    console.log(error);
  } finally {
    setTimeout(refreshFeeds, 0, restFeeds, appState);
  }
};

export const processFormData = async (appState) => {
  const {
    addRss, feeds, posts, proxy,
  } = appState;
  addRss.state = 'processing';
  const { data } = await axios.get(`${proxy.allOrigins}${addRss.url}`);
  const parsedData = parseRss(data.contents);
  addRss.state = 'processed';
  addRss.urlState = 'empty';
  const { title, description, itemsList } = parsedData;
  const newFeed = processFeed(title, description, addRss.url, feeds.list);
  feeds.list.push(newFeed);
  appState.dataState = 'adding'; //eslint-disable-line
  posts.fresh = processPosts(itemsList, posts, newFeed);

  startRefreshFeeds(appState, refreshFeeds);
};

export const removeData = (appState) => {
  const { feeds, posts } = appState;
  const { activeFeedId, list, timerId } = feeds;
  clearTimeout(timerId);
  feeds.state = 'not-updating';

  const remainingPosts = posts.all.filter(item => compare(item, activeFeedId));
  const remainingFeeds = list.filter(item => compare(item, activeFeedId));
  posts.all = remainingPosts;
  feeds.list = remainingFeeds;
  changeFeed(activeFeedId, appState, 'removing');

  if (remainingFeeds.length > 0) {
    startRefreshFeeds(appState, refreshFeeds);
  }
};
