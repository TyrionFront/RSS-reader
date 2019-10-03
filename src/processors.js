export const parseRss = (data) => {
  const domParser = new DOMParser();
  const domTree = domParser.parseFromString(data, 'application/xml');
  const parserError = domTree.querySelector('parsererror');
  if (parserError) {
    throw new Error('Data format is wrong: \'application/xml\'-method can not parse it');
  }

  const newsData = [...domTree.querySelectorAll('item')].map((item) => {
    const storyTitle = item.querySelector('title').textContent;
    const storyLink = item.querySelector('link').textContent;
    const storyDescription = item.querySelector('description').textContent;
    return [storyTitle, storyLink, storyDescription];
  }).reverse();

  const feedTitle = domTree.querySelector('channel title').textContent;
  const feedDescription = domTree.querySelector('channel description').textContent;
  return { feedInfo: [feedTitle, feedDescription], newsData };
};

export const updateNewsState = (newsData, currentFeedId, appState) => {
  const { items } = appState.feeds;
  const { allNewsTitles, allNews } = items;
  const newStories = newsData.reduce((acc, storyData) => {
    const [storyTitle] = storyData;
    if (allNewsTitles.has(storyTitle)) {
      return acc;
    }
    allNewsTitles.add(storyTitle);
    const storyId = `${currentFeedId}-story${acc.size + 1}`;
    return acc.set(storyId, storyData);
  }, new Map());

  const prevFeedAllNews = allNews.has(currentFeedId)
    ? allNews.get(currentFeedId) : new Map();
  allNews.set(currentFeedId, new Map([...prevFeedAllNews, ...newStories]));
  items.freshNews = [newStories, currentFeedId];
};

export const updateRssState = (feedInfo, appState) => {
  const [feedTitle, feedDescription] = feedInfo;
  const { feeds } = appState;
  const { allFeedsInfo, items } = feeds;
  const [feedStories, feedId] = items.freshNews;
  const updatedFeedsInfo = {
    ...allFeedsInfo,
    [feedId]: { feedTitle, feedDescription, newsCount: feedStories.size },
  };
  feeds.lastFeedId = feedId;
  feeds.allFeedsInfo = updatedFeedsInfo;
};
