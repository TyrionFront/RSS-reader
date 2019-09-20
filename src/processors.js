export const parseResponse = (preParsedData, dataType) => {
  const domParser = new DOMParser();
  const postParsedData = domParser.parseFromString(preParsedData, dataType);
  return postParsedData;
};

export const processParsedData = (data) => {
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
  const newsData = newsTitles
    .map(({ textContent }, i) => [textContent, newsLinks[i].textContent, newsDescriptions[i]])
    .reverse();

  const title = data.querySelector('channel title').textContent;
  const description = data.querySelector('channel description').textContent;
  return { info: [title, description], newsData };
};

export const processNews = (newsData, feedId, items) => {
  const { allNews } = items;
  const feedNews = allNews.has(feedId) ? allNews.get(feedId) : new Map();
  const feedNewsTitles = [...feedNews.values()]
    .reduce((acc, [storyTitle]) => acc.add(storyTitle), new Set());
  const feedNewsCount = feedNewsTitles.size;

  const feedFreshNews = newsData.reduce((acc, story) => {
    const freshNewsCount = acc.size;
    const [title] = story;
    if (feedNewsTitles.has(title)) {
      return acc;
    }
    const storyId = `${feedId}-story${feedNewsCount + freshNewsCount + 1}`;
    feedNews.set(storyId, story);
    return acc.set(storyId, story);
  }, new Map());

  allNews.set(feedId, feedNews);
  return feedFreshNews;
};

export const updateFreshNews = (freshNewsColl, appState) => {
  const { items } = appState.feeds;
  const { refreshingCount } = items;
  if (freshNewsColl.size > 0) {
    items.freshNews = freshNewsColl;
    items.refreshingCount = refreshingCount + 1;
  }
};

export const refreshFeeds = (feedIds, appState, httpCli, newsCol = new Map()) => {
  const [feedId, ...restFeedIds] = feedIds;
  if (!feedId) {
    updateFreshNews(newsCol, appState);
    return;
  }
  const { warning, feeds } = appState;
  const { link } = feeds.rssInfo[feedId];
  httpCli.get(`https://cors-anywhere.herokuapp.com/${link}`)
    .then(({ data }) => parseResponse(data, 'application/xml'))
    .then(processParsedData)
    .then(({ newsData }) => processNews(newsData, feedId, feeds.items))
    .then((news) => {
      const updatedNewsCol = new Map([...newsCol, ...news]);
      refreshFeeds(restFeedIds, appState, httpCli, updatedNewsCol);
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
  refreshFn(feedIds, state, httpCli);
  setTimeout(getFreshNews, 10000, state, httpCli, refreshFn);
};

export const updateFeedsState = (info, appState, feedId, feedUrl) => {
  const [title, description] = info;
  const { feeds } = appState;
  const { rssInfo, items } = feeds;
  const newsCount = items.allNews.get(feedId).size;
  feeds.lastFeedId = feedId;
  feeds
    .rssInfo = {
      ...rssInfo,
      [feedId]: {
        title,
        description,
        newsCount,
        link: feedUrl,
      },
    };
};
