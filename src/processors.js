/* eslint-disable no-param-reassign */
export const processResponse = (response, domParser) => {
  const data = domParser.parseFromString(response.data, 'application/xml');
  const parserError = data.querySelector('parsererror');
  if (parserError) {
    throw new Error('No rss found !\n Parser error: data format in not \'application/rss+xml\'');
  }
  const newsTitles = [...data.querySelectorAll('item title')];
  const newsLinks = [...data.querySelectorAll('item link')];
  const buffer = document.createElement('div'); // eslint-disable-line no-undef
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
  const { freshNews, allNews, allNewsTitles } = appState.feeds.items;
  const feedPrevNews = freshNews[feedId] ? freshNews[feedId] : {};
  allNews[feedId] = allNews[feedId] ? { ...allNews[feedId], ...feedPrevNews } : { ...feedPrevNews };
  const feedNewsTitles = allNewsTitles.has(feedId) ? allNewsTitles.get(feedId) : new Set();

  const feedNewsCount = feedNewsTitles.size;
  const feedFreshNews = newsList.reduce((acc, story) => {
    const freshNewsCount = Object.keys(acc).length;
    const [title] = story;
    const storyId = `story${feedNewsCount + freshNewsCount + 1}${feedId}`;
    if (feedNewsTitles.has(title)) {
      return acc;
    }
    feedNewsTitles.add(title);
    return { ...acc, [storyId]: story };
  }, {});

  const feedFreshNewsCount = Object.keys(feedFreshNews).length;
  if (feedFreshNewsCount > 0) {
    // console.log(`${new Date()} -- ${Object.keys(feedFreshNews)}`);
    const updatedNews = { ...freshNews, [feedId]: feedFreshNews, lastFeedWithNews: feedId };
    appState.feeds.items.freshNews = updatedNews;
    allNewsTitles.set(feedId, feedNewsTitles);
  }
};
