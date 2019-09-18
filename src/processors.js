/* eslint-disable no-param-reassign */
export const parseResponse = (response) => {
  const domParser = new DOMParser();
  const data = domParser.parseFromString(response.data, 'application/xml');
  const parserError = data.querySelector('parsererror');
  if (parserError) {
    throw new Error('data format is not \'application/rss+xml\'');
  }
  return data;
};

export const processData = (data) => {
  const newsTitles = [...data.querySelectorAll('item title')];
  const newsLinks = [...data.querySelectorAll('item link')];
  const buffer = document.createElement('div');
  const newsDescriptions = [...data.querySelectorAll('item description')]
    .map((elem) => { // in case if there is html-tags in previously parsed text
      buffer.innerHTML = elem.textContent;
      return buffer.textContent;
    });
  const newsList = newsTitles
    .map(({ textContent }, i) => [textContent, newsLinks[i].textContent, newsDescriptions[i]])
    .reverse();

  const title = data.querySelector('channel title').textContent;
  const description = data.querySelector('channel description').textContent;
  return { info: [title, description], newsList };
};

export const updateFeedsState = ({ newsList, info }, appState, feedUrl) => {
  const [title, description] = info;
  const {
    workableUrls, rssInfo,
  } = appState.feeds;

  workableUrls.add(feedUrl);
  const feedId = `rssFeed${workableUrls.size}`;
  appState.feeds.lastFeedId = feedId;
  appState.feeds
    .rssInfo = {
      ...rssInfo,
      [feedId]: {
        title,
        description,
        newsCount: newsList.length,
        link: feedUrl,
      },
    };
  return [newsList, feedId, appState];
};

export const processNews = (newsList, feedId, appState) => {
  const {
    allNews, allNewsTitles, freshNews,
  } = appState.feeds.items;
  const prevNews = Object.keys(freshNews).reduce((acc, storyId) => {
    const [feedMark] = storyId.split('-');
    acc[feedMark] = acc[feedMark] ? { ...acc[feedMark], [storyId]: freshNews[storyId] }
      : { [storyId]: freshNews[storyId] };
    return acc;
  }, {});

  const newAllNews = Object.keys(prevNews).reduce((stories, feedMark) => {
    stories[feedMark] = stories[feedMark] ? { ...stories[feedMark], ...prevNews[feedMark] }
      : { ...prevNews[feedMark] };
    return stories;
  }, allNews);
  appState.feeds.items.allNews = newAllNews;

  const feedNewsTitles = allNewsTitles.has(feedId) ? allNewsTitles.get(feedId) : new Set();
  const feedNewsCount = feedNewsTitles.size;
  const feedFreshNews = newsList.reduce((acc, story) => {
    const freshNewsCount = Object.keys(acc).length;
    const [title] = story;
    if (feedNewsTitles.has(title)) {
      return acc;
    }
    feedNewsTitles.add(title);
    const storyId = `${feedId}-story${feedNewsCount + freshNewsCount + 1}`;
    return { ...acc, [storyId]: story };
  }, {});

  allNewsTitles.set(feedId, feedNewsTitles);
  return feedFreshNews;
};

export const updateFreshNews = (freshNews, appState) => {
  const feedFreshNewsCount = Object.keys(freshNews).length;
  if (feedFreshNewsCount > 0) {
    appState.feeds.items.freshNews = { ...freshNews };
  }
};

export const refreshFeeds = ([feedId, ...restFeedIds], rssInfo, appState, axios, newsCol = {}) => {
  if (!feedId) {
    updateFreshNews(newsCol, appState);
    return;
  }
  const { link } = rssInfo[feedId];
  axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
    .then(parseResponse)
    .then(processData)
    .then(processedData => processNews(processedData.newsList, feedId, appState))
    .then((news) => {
      const updatedNewsCol = { ...newsCol, ...news };
      refreshFeeds(restFeedIds, rssInfo, appState, axios, updatedNewsCol);
    })
    .catch((err) => {
      const { isExist } = appState.warning.refreshing;
      appState.warning.refreshing.warningMessage = `Refreshing failed !\n${err}`;
      appState.warning.refreshing.isExist = !isExist;
      throw new Error(err);
    });
};

export const getFreshNews = (state, axios, refreshFn) => {
  const { rssInfo } = state.feeds;
  const feedIds = Object.keys(rssInfo);
  refreshFn(feedIds, rssInfo, state, axios);
  setTimeout(getFreshNews, 30000, state, axios, refreshFn);
};
