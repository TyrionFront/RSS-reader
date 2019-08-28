/* global document */
/* eslint no-undef: "error" */
import $ from 'jquery';

export const makeRssFeedsList = ({ feeds }, feedsList, example, showHideFeedNews) => {
  const { rssInfo, lastFeedId } = feeds;
  const lastRssInfo = rssInfo[lastFeedId];
  const { title, description, newsCount } = lastRssInfo;
  const newLi = $(example).clone(true, true);
  example.style.display = 'none'; // eslint-disable-line no-param-reassign
  newLi[0].id = lastFeedId;
  newLi[0].addEventListener('click', showHideFeedNews);
  newLi.css('display', 'block');
  newLi.find('h5').text(title);
  newLi.find('p').text(description);
  newLi.find('span.badge').attr('id', `newsCount${lastFeedId}`).text(newsCount);
  newLi.prependTo(feedsList);
};

export const makeNewsList = ({ feeds }, newsTag, example) => {
  const { lastFeedId, items } = feeds;
  const { freshNews, allNews } = items;
  const currentFeedAllNewsCount = Object.keys(allNews[lastFeedId]).length;
  const currentFreshNewsList = freshNews[lastFeedId];
  const currentFreshNewsIds = Object.keys(currentFreshNewsList);
  const badge = document.getElementById(`newsCount${lastFeedId}`);
  currentFreshNewsIds.forEach((storyId) => {
    const [title, link, description] = currentFreshNewsList[storyId];
    const li = $(example).clone(true);
    li[0].id = storyId;
    li.addClass(lastFeedId);
    li.css('display', 'block');
    li.find('a').attr('href', link).text(title);
    li.find('.btn-outline-info').attr('data-target', `#modal${storyId}`);
    li.find('.modal').attr('id', `modal${storyId}`);
    li.find('.modal-title').attr('id', `title${storyId}`).text(title);
    li.find('.modal-body').text(description);
    li.prependTo(newsTag);
  });
  example.style.display = 'none'; // eslint-disable-line no-param-reassign
  newsTag.style.display = 'block'; // eslint-disable-line no-param-reassign
  badge.textContent = currentFreshNewsIds.length + currentFeedAllNewsCount;
};
