/* eslint-disable no-param-reassign */
export const processResponse = (response) => {
  const domParser = new DOMParser(); // eslint-disable-line no-undef
  const data = domParser.parseFromString(response.data, 'application/xml');
  const newsTitles = [...data.querySelectorAll('item title')];
  const newsLinks = [...data.querySelectorAll('item link')];
  const buffer = document.createElement('div'); // eslint-disable-line no-undef
  const newsDescriptions = [...data.querySelectorAll('item description')]
    .map((elem) => { // in case if there is html-tags in previously parsed text
      buffer.innerHTML = elem.textContent;
      return buffer.textContent;
    });
  const newsList = newsTitles
    .map(({ textContent }, i) => [textContent,
      newsLinks[i].textContent, newsDescriptions[i]])
    .reverse();

  const title = data.querySelector('channel title').textContent;
  const description = data.querySelector('channel description').textContent;
  return { info: [title, description], newsList };
};

export const processRssData = ({ newsList, info }, appState, feedUrl) => {
  const [title, description] = info;
  const {
    workableUrls, rssInfo,
  } = appState.feeds;

  const feedId = `rssFeed${workableUrls.size}`;
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

export const processNews = (newsList, rssId, appState) => {
  const { freshNews, allNews } = appState.feeds.items;
  const prevFreshNews = freshNews[rssId] ? freshNews[rssId] : {};
  allNews[rssId] = allNews[rssId] ? { ...allNews[rssId], ...prevFreshNews } : { ...prevFreshNews };
  const feedNewsTitles = Object.keys(allNews[rssId]).reduce((acc, storyId) => {
    const [title] = allNews[rssId][storyId];
    return acc.add(title);
  }, new Set());

  const feedNewsCount = feedNewsTitles.size;
  const currentFreshNews = newsList.reduce((acc, story) => {
    const freshNewsCount = Object.keys(acc).length;
    const [title, link, description] = story;
    const storyId = `story${feedNewsCount + freshNewsCount + 1}${rssId}`;
    return feedNewsTitles.has(title) || acc[storyId]
      ? acc : { ...acc, [storyId]: [title, link, description] };
  }, {});
  const currentFreshNewsCount = Object.keys(currentFreshNews).length;
  const newFreshNews = { ...freshNews, [rssId]: currentFreshNews };
  if (currentFreshNewsCount > 0) {
    appState.feeds.lastFeedId = rssId;
    appState.feeds.items.freshNews = newFreshNews;
  }
};
