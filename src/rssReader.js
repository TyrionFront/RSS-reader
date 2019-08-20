/* global document */
/* eslint no-undef: "error" */

import axios from 'axios';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import { processResponse, processRssData, processNews } from './processors';
import { makeRssFeedsList, makeNewsList } from './htmlMakers';

export default () => {
  const appState = {
    typedLink: {
      isEmpty: true,
      isValid: false,
    },
    feeds: {
      lastValidUrl: '',
      lastAddedUrl: '',
      lastFeedId: '',
      allAddedUrls: new Set(),
      workableUrls: new Set(),
      rssInfo: {},
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

  watch(appState, 'typedLink', () => {
    inputField.classList.toggle('border-danger');
    addLinkBtn.disabled = !appState.typedLink.isValid;
  });

  watch(appState.feeds, 'lastAddedUrl', () => {
    inputField.value = '';
  });

  watch(appState.feeds, 'rssInfo', () => {
    makeRssFeedsList(appState, feedsTag, rssExample);
  });

  watch(appState.feeds.items, 'freshNews', () => {
    makeNewsList(appState, newsTag);
  });

  inputField.addEventListener('input', ({ target }) => {
    const { value } = target;
    appState.typedLink.isEmpty = value.length === 0;
    const { allAddedUrls } = appState.feeds;
    const isLinkInList = allAddedUrls.has(value);
    const isLinkValid = validator.isURL(value) && !isLinkInList;
    appState.typedLink.isValid = isLinkValid;
    if (isLinkValid) {
      appState.feeds.lastValidUrl = value;
    }
  });

  addLinkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!e.target.disabled) {
      const { allAddedUrls, workableUrls, lastValidUrl } = appState.feeds;
      allAddedUrls.add(lastValidUrl);
      workableUrls.add(lastValidUrl);
      appState.feeds.lastAddedUrl = lastValidUrl;
      appState.typedLink.isEmpty = true;
      appState.typedLink.isValid = false;

      axios.get(`https://cors-anywhere.herokuapp.com/${lastValidUrl}`)
        .then(processResponse)
        .then(data => processRssData(data, appState, lastValidUrl))
        .then((result) => {
          processNews(...result);
        })
        .catch((err) => {
          alert(`Wrong news source or bad connection !\n${err}`); // eslint-disable-line
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
  getFreshNews();
};
