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
  const { currentFeedWithNews, ...prevNews } = freshNews;
  allNews[currentFeedWithNews] = allNews[currentFeedWithNews]
    ? { ...allNews[currentFeedWithNews], ...prevNews } : { ...prevNews };
  const feedNewsTitles = allNewsTitles.has(feedId) ? allNewsTitles.get(feedId) : new Set();

  const feedNewsCount = feedNewsTitles.size;
  const feedFreshNews = newsList.reduce((acc, story) => {
    const freshNewsCount = Object.keys(acc).length;
    const [title] = story;
    if (feedNewsTitles.has(title)) {
      return acc;
    }
    feedNewsTitles.add(title);
    const storyId = `story${feedNewsCount + freshNewsCount + 1}${feedId}`;
    return { ...acc, [storyId]: story };
  }, {});

  const feedFreshNewsCount = Object.keys(feedFreshNews).length;
  if (feedFreshNewsCount > 0) {
    console.log(`${new Date()} -- ${Object.keys(feedFreshNews)} -- ${feedId}`);
    allNewsTitles.set(feedId, feedNewsTitles);
    appState.feeds.items.freshNews = { ...feedFreshNews, currentFeedWithNews: feedId };
  }
};

export const refreshFeed = ([feedId, ...rest], rssInfo, appState, axios) => {
  if (!feedId) {
    return;
  }
  console.log(`${new Date()} --- ${feedId} -- refresh`);
  const { link } = rssInfo[feedId];
  axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
    .then(parseResponse)
    .then(processData)
    .then(processedData => processNews(processedData.newsList, feedId, appState))
    .then(() => refreshFeed(rest, rssInfo, appState, axios))
    .catch((err) => {
      alert(`Refreshing failed:\n ${err}`); // eslint-disable-line
      throw new Error(err);
    });
};

export const getFreshNews = (state, axios, refreshFn) => {
  const { rssInfo } = state.feeds;
  const feedIds = Object.keys(rssInfo);
  refreshFn(feedIds, rssInfo, state, axios);
  setTimeout(getFreshNews, 30000, state, axios, refreshFn);
};
