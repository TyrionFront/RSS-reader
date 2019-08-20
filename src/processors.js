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
      newsLinks[i].textContent, newsDescriptions[i]]);

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
  const channelFreshNews = freshNews[rssId] ? freshNews[rssId] : {};
  allNews[rssId] = allNews[rssId] ? { ...allNews[rssId], ...channelFreshNews } : {};
  const updatedList = newsList.reduce((acc, story) => {
    const [title, link, description] = story;
    return allNews[rssId][title] ? acc : { [title]: [link, description], ...acc };
  }, {});
  const listSize = Object.keys(updatedList).length;
  const newFreshNews = { ...freshNews, [rssId]: updatedList };
  if (listSize > 0) {
    appState.feeds.lastFeedId = rssId;
    appState.feeds.items.freshNews = newFreshNews;
  }
};
