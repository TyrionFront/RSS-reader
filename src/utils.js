import validator from 'validator';


export const validateUrl = (feeds, url) => {
  const sameFeed = feeds.find(feed => feed.url === url);
  const isUrl = validator.isURL(url, { require_protocol: true });
  let warning;
  if (sameFeed) {
    warning = 'sameFeed';
  }
  if (!isUrl) {
    warning = 'wrong';
  }
  return [isUrl && !sameFeed, warning];
};

export const compare = (item, idToCompare) => {
  const [itemId] = item.postId ? item.postId.split('-') : [item.feedId];
  return itemId !== idToCompare;
};

export const getElement = (coll, tagId) => {
  let htmlTag = coll[tagId];
  if (!htmlTag) {
    htmlTag = document.getElementById(tagId);
    coll[tagId] = htmlTag; // eslint-disable-line no-param-reassign
  }
  return htmlTag;
};

export const makeSelection = (text, activeFeedId, posts) => {
  const coll = !activeFeedId
    ? posts.slice(0) : posts.filter(({ postId }) => postId.includes(activeFeedId));
  if (!text) {
    return [coll, 'empty'];
  }
  const matchedPosts = coll.filter(({ postTitle }) => postTitle.toLowerCase().includes(text));
  return matchedPosts.length > 0 ? [matchedPosts, 'matched'] : [coll, 'noMatches'];
};

export const changeFeed = (currentFeedId, appState, dataState) => {
  appState.dataState = dataState || 'waiting'; // eslint-disable-line
  const { posts, search, feeds } = appState;
  const { activeFeedId } = feeds;

  const renewedId = activeFeedId !== currentFeedId ? currentFeedId : '';
  const [matchedPosts, searchState] = makeSelection(search.text, renewedId, posts.all);

  feeds.activeFeedId = renewedId;
  posts.selected = matchedPosts;
  search.inputState = searchState;
};

export const startRefreshFeeds = (appState, refreshFeeds) => {
  const { feeds } = appState;
  if (feeds.state === 'not-updating') {
    feeds.state = 'updating';
    const refresh = async () => {
      await refreshFeeds(appState.feeds.list, appState);
      feeds.timerId = setTimeout(refresh, 300000);
    };
    feeds.timerId = setTimeout(refresh, 7000);
  }
};
