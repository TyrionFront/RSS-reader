export const parseResponse = (preParsedData, dataType) => {
  const domParser = new DOMParser();
  const postParsedData = domParser.parseFromString(preParsedData, dataType);
  return postParsedData;
};

export const processData = (data) => {
  const parserError = data.querySelector('parsererror');
  if (parserError) {
    throw new Error('data format is not \'application/rss+xml\'');
  }
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
  const { feeds } = appState;
  const { workableUrls, rssInfo } = feeds;

  workableUrls.add(feedUrl);
  const feedId = `rssFeed${workableUrls.size}`;
  feeds.lastFeedId = feedId;
  feeds
    .rssInfo = {
      ...rssInfo,
      [feedId]: {
        title,
        description,
        newsCount: newsList.length,
        link: feedUrl,
      },
    };
  return [newsList, feedId];
};

export const processNews = (newsList, feedId, appState) => {
  const { items } = appState.feeds;
  const { allNews, allNewsTitles, freshNews } = items;
  const prevNews = Object.keys(freshNews).reduce((acc, storyId) => {
    const [feedMark] = storyId.split('-');
    acc[feedMark] = acc[feedMark] ? { ...acc[feedMark], [storyId]: freshNews[storyId] }
      : { [storyId]: freshNews[storyId] };
    return acc;
  }, {});

  const newAllNews = Object.keys(prevNews).reduce((stories, feedMark) => {
    const newStories = stories[feedMark] ? { ...stories[feedMark], ...prevNews[feedMark] }
      : { ...prevNews[feedMark] };
    return newStories;
  }, allNews);
  items.allNews = newAllNews;

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
  const { items } = appState.feeds;
  if (feedFreshNewsCount > 0) {
    items.freshNews = { ...freshNews };
  }
};

export const refreshFeeds = (feedIds, rssInfo, appState, httpCli, newsCol = {}) => {
  const [feedId, ...restFeedIds] = feedIds;
  if (!feedId) {
    updateFreshNews(newsCol, appState);
    return;
  }
  const { warning } = appState;
  const { link } = rssInfo[feedId];
  httpCli.get(`https://cors-anywhere.herokuapp.com/${link}`)
    .then(({ data }) => parseResponse(data, 'application/xml'))
    .then(processData)
    .then(processedData => processNews(processedData.newsList, feedId, appState))
    .then((news) => {
      const updatedNewsCol = { ...newsCol, ...news };
      refreshFeeds(restFeedIds, rssInfo, appState, httpCli, updatedNewsCol);
    })
    .catch((err) => {
      const { isExist } = warning.refreshing;
      warning.refreshing.warningMessage = `Refreshing failed !\n${err}`;
      warning.refreshing.isExist = !isExist;
      throw new Error(err);
    });
};

export const getFreshNews = (state, httpCli, refreshFn) => {
  const { rssInfo } = state.feeds;
  const feedIds = Object.keys(rssInfo);
  refreshFn(feedIds, rssInfo, state, httpCli);
  setTimeout(getFreshNews, 30000, state, httpCli, refreshFn);
};
