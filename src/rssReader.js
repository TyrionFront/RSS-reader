/* global document */
/* eslint no-undef: "error" */

import axios from 'axios';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import { processResponse, updateFeedsState, processNews } from './processors';
import { makeRssFeedsList, makeNewsList, displayNews } from './htmlMakers';

export default () => {
  const appState = {
    links: {
      typedLink: {
        isEmpty: true,
        isValid: false,
      },
      disableAddLink: true,
      lastValidUrl: '',
      lastAddedUrl: '',
    },
    feeds: {
      lastFeedId: '',
      allAddedUrls: new Set(),
      rssInfo: {},
      activeFeedId: '',
      prevActiveFeedId: '',
      items: {
        freshNews: {},
        allNews: {},
      },
    },
  };

  const [inputField, addLinkBtn] = [...document.querySelector('.jumbotron form').children];
  const feedsTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');
  const rssExample = document.getElementById('rssExample');
  const storyExample = document.getElementById('storyExample');
  const rssTypes = ['application/xml', 'application/rss+xml'];

  const markActive = ({ currentTarget }) => {
    const { activeFeedId } = appState.feeds;
    const currentId = currentTarget.id;
    appState.feeds.prevActiveFeedId = activeFeedId;
    appState.feeds.activeFeedId = activeFeedId !== currentId ? currentId : `${currentId} sameFeed`;
  };

  watch(appState.links, 'typedLink', () => {
    inputField.classList.toggle('border-danger');
  });

  watch(appState.links, 'disableAddLink', () => {
    addLinkBtn.disabled = appState.links.disableAddLink;
  });

  watch(appState.links, 'lastAddedUrl', () => {
    inputField.value = '';
  });

  watch(appState.feeds, 'rssInfo', () => {
    makeRssFeedsList(appState, feedsTag, rssExample, markActive);
  });

  watch(appState.feeds.items, 'freshNews', () => {
    makeNewsList(appState, newsTag, storyExample);
  });

  watch(appState.feeds, 'activeFeedId', () => {
    displayNews(appState, newsTag);
  });

  inputField.addEventListener('input', ({ target }) => {
    const { value } = target;
    appState.links.typedLink.isEmpty = value.length === 0;
    const { allAddedUrls } = appState.feeds;
    const isLinkInList = allAddedUrls.has(value);
    const isLinkValid = validator.isURL(value) && !isLinkInList;
    if (isLinkValid) {
      axios.get(`https://cors-anywhere.herokuapp.com/${value}`)
        .then(({ headers }) => {
          const isItRss = rssTypes.some(type => headers['content-type'].includes(type));
          if (!isItRss) {
            throw new Error('Not rss link');
          }
          appState.links.lastValidUrl = value;
          appState.links.typedLink.isValid = isLinkValid;
          appState.links.disableAddLink = !isLinkValid;
        })
        .catch((err) => {
          appState.links.disableAddLink = isLinkValid;
          appState.links.typedLink.isValid = !isLinkValid;
          alert(`Incorrect URL or bad internet connection !\n${err}`); // eslint-disable-line
          throw new Error(err);
        });
    }
  });

  addLinkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!e.target.disabled) {
      const { lastValidUrl } = appState.links;
      appState.feeds.allAddedUrls.add(lastValidUrl);
      appState.links.lastAddedUrl = lastValidUrl;
      appState.links.typedLink.isEmpty = true;
      appState.links.typedLink.isValid = false;
      appState.links.disableAddLink = true;

      axios.get(`https://cors-anywhere.herokuapp.com/${lastValidUrl}`)
        .then(processResponse)
        .then(data => updateFeedsState(data, appState, lastValidUrl))
        .then(result => processNews(...result))
        .catch((err) => {
          alert(`Problem with news uploading !\n${err}`); // eslint-disable-line
          throw new Error(err);
        });
    }
  });

  const getFreshNews = () => {
    const { rssInfo } = appState.feeds;
    Object.keys(rssInfo).forEach((feedId) => {
      const { link } = rssInfo[feedId];
      axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
        .then(processResponse)
        .then(data => processNews(data.newsList, feedId, appState))
        .catch((err) => {
          alert(`Refreshing failed:\n ${err}`); // eslint-disable-line
          throw new Error(err);
        });
    });
    setTimeout(getFreshNews, 30000);
  };

  setTimeout(getFreshNews, 35000);
};
