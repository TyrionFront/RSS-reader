/* global document */
/* eslint no-undef: "error" */
import $ from 'jquery';

export const makeRssFeedsList = ({ feeds }, feedsList, example, markActive) => {
  const { rssInfo, lastFeedId } = feeds;
  const lastRssInfo = rssInfo[lastFeedId];
  const { title, description, newsCount } = lastRssInfo;
  const newLi = $(example).clone(true);
  example.style.display = 'none'; // eslint-disable-line no-param-reassign
  newLi[0].id = lastFeedId;
  newLi[0].addEventListener('click', markActive);
  newLi.css('display', 'block');
  newLi.find('h5').text(title);
  newLi.find('p').text(description);
  newLi.find('span.badge').attr('id', `newsCount${lastFeedId}`).text(newsCount);
  newLi.prependTo(feedsList);
};

export const makeNewsList = ({ feeds }, newsTag, example) => {
  const { activeFeedId, items } = feeds;
  const { freshNews, allNewsTitles } = items;
  const { lastFeedWithNews } = freshNews;
  const [activeId, sameIdMark] = activeFeedId.split(' ');

  const currentFeedAllNewsCount = allNewsTitles.get(lastFeedWithNews).size;
  const currentFeedFreshNews = freshNews[lastFeedWithNews];
  const currentFreshNewsIds = Object.keys(currentFeedFreshNews);
  const badge = document.getElementById(`newsCount${lastFeedWithNews}`);
  const visualization = !activeId || sameIdMark || activeId === lastFeedWithNews ? 'block' : 'none';
  currentFreshNewsIds.forEach((storyId) => {
    const [title, link, description] = currentFeedFreshNews[storyId];
    const li = $(example).clone(true);
    li[0].id = storyId;
    li.addClass(lastFeedWithNews);
    li.css('display', visualization);
    li.find('a').attr('href', link).text(title);
    li.find('.btn-outline-info').attr('data-target', `#modal${storyId}`);
    li.find('.modal').attr('id', `modal${storyId}`);
    li.find('.modal-title').attr('id', `title${storyId}`).text(title);
    li.find('.modal-body').text(description);
    li.prependTo(newsTag);
  });
  example.style.display = 'none'; // eslint-disable-line no-param-reassign
  newsTag.style.display = 'block'; // eslint-disable-line no-param-reassign
  badge.textContent = currentFeedAllNewsCount;
};

export const displayNews = ({ feeds }, newsListTag) => {
  const { activeFeedId, prevActiveFeedId } = feeds;
  const [currentId] = activeFeedId.split(' ');
  const prevFeed = document.querySelector('#rssFeeds .active');
  const currentFeed = document.getElementById(currentId);
  const news = $(newsListTag).find('li');
  if (currentId === prevActiveFeedId) {
    news.css('display', 'block');
    currentFeed.classList.toggle('active');
    return;
  }
  if (prevFeed) {
    prevFeed.classList.remove('active');
  }
  news.css('display', 'none');
  currentFeed.classList.add('active');
  $(newsListTag).find(`.${currentId}`).css('display', 'block');
};
