/* global document */
/* eslint no-undef: "error" */
import $ from 'jquery';

export const makeRssFeedsList = ({ feeds }, feedsTag, example) => {
  const { rssInfo, lastFeedId } = feeds;
  const lastRssInfo = rssInfo[lastFeedId];
  if (feedsTag.contains(example)) {
    feedsTag.removeChild(example);
  }
  const { title, description, newsCount } = lastRssInfo;
  const newLi = example.cloneNode(true);
  newLi.id = lastFeedId;
  $(newLi).find('h5.mb-1').text(title);
  $(newLi).find('p.mb-1').text(description);
  $(newLi).find('span.badge').attr('id', `newsCount${lastFeedId}`).text(newsCount);
  feedsTag.prepend(newLi);
};

export const makeNewsList = ({ feeds }, newsTag, example) => {
  if (newsTag.contains(example)) {
    newsTag.removeChild(example);
  }
  const { lastFeedId, items } = feeds;
  const { freshNews, allNews } = items;
  const currentFeedAllNewsCount = Object.keys(allNews[lastFeedId]).length;
  const currentFreshNewsList = freshNews[lastFeedId];
  const currentFreshNewsTitles = Object.keys(currentFreshNewsList);
  const badge = document.getElementById(`newsCount${lastFeedId}`);
  currentFreshNewsTitles.forEach((title, i) => {
    const [link, description] = currentFreshNewsList[title];
    const storyId = `story${i + currentFeedAllNewsCount}${lastFeedId}`;
    const li = example.cloneNode(true);
    li.id = storyId;
    $(li).find('a').attr('href', link).text(title);
    $(li).find('.btn-outline-info').attr('data-target', `#modal${storyId}`);
    $(li).find('.modal').attr('id', `modal${storyId}`);
    $(li).find('.modal-title').attr('id', `title${storyId}`).text(title);
    $(li).find('.modal-body').text(description);
    newsTag.prepend(li);
    newsTag.style.display = 'block'; // eslint-disable-line no-param-reassign
  });
  badge.textContent = currentFreshNewsTitles.length + currentFeedAllNewsCount;
};
