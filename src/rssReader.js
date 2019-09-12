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
      lastValidUrl: '',
      lastAddedUrl: '',
      allAddedUrls: new Set(),
    },
    feeds: {
      lastFeedId: '',
      workableUrls: new Set(),
      rssInfo: {},
      activeFeedId: '',
      prevActiveFeedId: '',
      items: {
        freshNews: {},
        allNews: {},
        allNewsTitles: new Map(),
      },
    },
  };

  const [inputField, addLinkBtn] = [...document.querySelector('.jumbotron form').children];
  const feedsTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');
  const rssExample = document.getElementById('rssExample');
  const storyExample = document.getElementById('storyExample');
  const domParser = new DOMParser(); // eslint-disable-line no-undef

  const markActive = ({ currentTarget }) => {
    const { activeFeedId } = appState.feeds;
    const currentId = currentTarget.id;
    appState.feeds.prevActiveFeedId = activeFeedId;
    appState.feeds.activeFeedId = activeFeedId !== currentId ? currentId : `${currentId} sameFeed`;
  };

  watch(appState.links, 'typedLink', () => {
    inputField.classList.toggle('border-danger');
    addLinkBtn.disabled = !appState.links.typedLink.isValid;
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
    const { allAddedUrls } = appState.links;
    const isLinkInList = allAddedUrls.has(value);
    const isLinkValid = validator.isURL(value) && !isLinkInList;
    appState.links.typedLink.isValid = isLinkValid;
    if (isLinkValid) {
      appState.links.lastValidUrl = value;
    }
  });

  const getFreshNews = () => {
    // console.log(`refreshing: ${new Date()}`);
    const { rssInfo } = appState.feeds;
    Object.keys(rssInfo).forEach((feedId) => {
      const { link } = rssInfo[feedId];
      axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
        .then(response => processResponse(response, domParser))
        .then(data => processNews(data.newsList, feedId, appState))
        .catch((err) => {
          alert(`Refreshing failed:\n ${err}`); // eslint-disable-line
          throw new Error(err);
        });
    });
    setTimeout(getFreshNews, 30000);
  };
  let refreshingIsNotStarted = true;

  addLinkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!e.target.disabled) {
      const { lastValidUrl, allAddedUrls } = appState.links;
      allAddedUrls.add(lastValidUrl);
      appState.links.lastAddedUrl = lastValidUrl;
      appState.links.typedLink.isEmpty = true;
      appState.links.typedLink.isValid = false;

      axios.get(`https://cors-anywhere.herokuapp.com/${lastValidUrl}`)
        .then(response => processResponse(response, domParser))
        .then(data => updateFeedsState(data, appState, lastValidUrl))
        .then((result) => {
          processNews(...result);
          if (refreshingIsNotStarted) {
            refreshingIsNotStarted = false;
            setTimeout(getFreshNews, 30000);
          }
        })
        .catch((err) => {
          alert(`Incorrect URL or bad internet connection !\n${err}`); // eslint-disable-line
          throw new Error(err);
        });
    }
  });
};
