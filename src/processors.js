import validator from 'validator';
import axios from 'axios';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp

const validateUrl = (feeds, url) => {
  const sameFeed = feeds.find(feed => feed.url === url);
  const isUrl = validator.isURL(url);
  let warning;
  if (sameFeed) {
    warning = 'sameFeed';
  }
  if (!isUrl) {
    warning = 'wrong';
  }
  return [isUrl && !sameFeed, warning];
};

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
  const { length } = feedsList;
  const lastIdNum = length > 0 ? feedsList[length - 1].feedId.split('_')[1] : 0;
  const feedId = `rssFeed_${Number(lastIdNum) + 1}`;
  return {
    feedId, title, description, postsCount: 0, url,
  };
};

const processPosts = (itemsList, currentFeedId, posts, feeds) => {
  const { all } = posts;
  const currentFeed = _.find(feeds, ['feedId', currentFeedId]);
  const newPosts = _.differenceBy(itemsList, all, 'postTitle');
  const newPostsWithId = newPosts.map((post) => {
    currentFeed.postsCount += 1;
    const postId = `${currentFeedId}-post${currentFeed.postsCount}`;
    const postWithId = { ...post, postId };
    all.push(postWithId);
    return postWithId;
  });
  return [currentFeedId, newPostsWithId];
};

const refreshFeeds = ([currentFeed, ...restFeeds], appState) => {
  const { posts, feeds } = appState;
  if (!currentFeed) {
    return;
  }
  const { feedId, url } = currentFeed;
  axios.get(`https://cors-anywhere.herokuapp.com/${url}`)
    .then(({ data }) => parseRss(data))
    .then(({ itemsList }) => processPosts(itemsList, feedId, posts, feeds.list))
    .then((freshPosts) => {
      posts.fresh = freshPosts;
      setTimeout(() => refreshFeeds(restFeeds, appState), 0);
    });
};

const startRefreshFeeds = (appState) => {
  const { feeds } = appState;
  if (feeds.state === 'not-updating') {
    feeds.state = 'updating';
    const refresh = () => {
      feeds.timerId = setTimeout(() => {
        refreshFeeds(appState.feeds.list, appState);
        setTimeout(refresh, 30000);
      }, 30000);
    };
    refresh();
  }
};

export const processFormData = (appState) => {
  const {
    dataState, addRss, feeds, posts,
  } = appState;
  addRss.state = 'processing';
  axios.get(`https://cors-anywhere.herokuapp.com/${addRss.url}`)
    .then(({ data }) => {
      const parsedData = parseRss(data);
      addRss.state = 'processed';
      addRss.urlState = 'empty';
      return parsedData;
    })
    .then(({ title, description, itemsList }) => {
      const newFeed = processFeed(title, description, addRss.url, feeds.list);
      if (dataState === 'removing') {
        appState.dataState = 'adding'; // eslint-disable-line
        feeds.activeFeedId = '';
      }
      feeds.list.push(newFeed);
      posts.fresh = processPosts(itemsList, newFeed.feedId, posts, feeds.list);

      startRefreshFeeds(appState);
    })
    .catch((err) => {
      addRss.urlState = 'is-invalid';
      addRss.state = 'failed';
      if (err.response) {
        addRss.responseStatus = err.response.status;
        throw new Error(err);
      }
      const [statusType] = err.message.split(' ');
      addRss.responseStatus = statusType;
      throw new Error(err);
    });
};

export const makeSelection = (text, activeFeedId, posts) => {
  const coll = !activeFeedId
    ? posts : posts.filter(({ postId }) => postId.includes(activeFeedId));
  if (!text) {
    return [coll, 'empty'];
  }
  const matchedPosts = coll.filter(({ postTitle }) => postTitle.toLowerCase().includes(text));
  return matchedPosts.length > 0 ? [matchedPosts, 'matched'] : [coll, 'noMatches'];
};

export const changeFeed = (currentFeedId, appState) => {
  appState.dataState = 'waiting'; // eslint-disable-line
  const { posts, search, feeds } = appState;
  const { activeFeedId } = feeds;

  const renewedId = activeFeedId !== currentFeedId ? currentFeedId : '';
  const [matchedPosts, searchState] = makeSelection(search.text, renewedId, posts.all);

  feeds.activeFeedId = renewedId;
  posts.selected = matchedPosts;
  search.inputState = searchState;
};

export const removeData = (appState) => {
  appState.dataState = 'removing'; // eslint-disable-line no-param-reassign
  const { feeds, posts } = appState;
  const { activeFeedId, list, timerId } = feeds;
  clearTimeout(timerId);

  const separate = (item) => {
    const [feedId] = item.postId ? item.postId.split('-') : [item.feedId];
    return feedId !== activeFeedId;
  };

  const remainingPosts = posts.all.filter(separate);
  const remainingFeeds = list.filter(separate);
  posts.all = remainingPosts;
  posts.selected = [];
  feeds.list = remainingFeeds;

  if (remainingFeeds.length > 0) {
    startRefreshFeeds(appState);
  }
};
