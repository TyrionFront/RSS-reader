import axios from 'axios';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import $ from 'jquery';
import {
  parseResponse, processParsedData, updateFeedsState, processNews,
  getFreshNews, refreshFeeds, updateFreshNews,
} from './processors';
import {
  makeRssFeedElem, moveRssForm, makeNewsList, displayNews,
} from './htmlMakers';

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
    warning: {
      input: {
        isExist: false,
        warningMessage: '',
      },
      refreshing: {
        isExist: false,
        warningMessage: '',
      },
    },
    feeds: {
      lastFeedId: '',
      workableUrls: new Set(),
      rssInfo: {},
      activeFeedId: '',
      prevActiveFeedId: '',
      items: {
        freshNews: new Map(),
        allNews: new Map(),
        refreshingCount: 0,
      },
      refreshingIsNotStarted: true,
    },
    rssFormState: {
      atTheBottom: false,
    },
  };

  const formContainer = document.getElementById('jumbotron');
  const addRssForm = document.getElementById('addRss');
  const addLinkBtn = document.getElementById('confirm');
  const inputField = document.getElementById('urlField');
  const warningNode = document.getElementById('wrongInput');
  const feedsTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');
  const rssExample = document.getElementById('rssExample');
  const storyExample = document.getElementById('storyExample');

  const markActive = ({ currentTarget }) => {
    const { activeFeedId } = appState.feeds;
    const currentId = currentTarget.id;
    appState.feeds.prevActiveFeedId = activeFeedId;
    appState.feeds.activeFeedId = activeFeedId !== currentId ? currentId : `${currentId} sameFeed`;
  };

  watch(appState.links, 'typedLink', () => {
    inputField.classList.toggle('is-invalid');
    addLinkBtn.disabled = !appState.links.typedLink.isValid;
  });

  watch(appState.links.typedLink, 'isValid', () => {
    inputField.classList.toggle('is-valid');
  });

  watch(appState.warning.input, 'isExist', () => {
    warningNode.innerText = appState.warning.input.warningMessage;
    warningNode.classList.replace('d-none', 'd-inline');
  });

  watch(appState.warning.input, 'warningMessage', () => {
    warningNode.classList.replace('d-inline', 'd-none');
  });

  watch(appState.warning.refreshing, 'isExist', () => {
    const modal = $('#refreshingFailed');
    $('#refreshingFailed .modal-content').text(appState.warning.refreshing.warningMessage);
    modal.modal();
  });

  watch(appState.links, 'lastAddedUrl', () => {
    inputField.value = '';
  });

  watch(appState.rssFormState, 'atTheBottom', () => {
    moveRssForm(formContainer);
  });

  watch(appState.feeds, 'rssInfo', () => {
    makeRssFeedElem(appState, feedsTag, rssExample, markActive);
  });

  watch(appState.feeds.items, 'refreshingCount', () => {
    makeNewsList(appState, newsTag, storyExample);
  });

  watch(appState.feeds, 'activeFeedId', () => {
    displayNews(appState, newsTag);
  });

  inputField.addEventListener('input', ({ target }) => {
    const { warningMessage } = appState.warning.input;
    if (warningMessage) {
      appState.warning.input.warningMessage = '';
    }
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


  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { lastValidUrl, allAddedUrls } = appState.links;

    if (!allAddedUrls.has(lastValidUrl)) {
      allAddedUrls.add(lastValidUrl);
      axios.get(`https://cors-anywhere.herokuapp.com/${lastValidUrl}`)
        .then(({ data }) => parseResponse(data, 'application/xml'))
        .then((data) => {
          const processedData = processParsedData(data);
          appState.links.lastAddedUrl = lastValidUrl;
          appState.links.typedLink.isEmpty = true;
          appState.links.typedLink.isValid = false;
          return processedData;
        })
        .then(({ newsData, info }) => {
          if (!appState.rssFormState.atTheBottom) {
            appState.rssFormState.atTheBottom = true;
          }
          const { workableUrls, items } = appState.feeds;
          workableUrls.add(lastValidUrl);
          const feedId = `rssFeed${workableUrls.size}`;

          const feedFreshNews = processNews(newsData, feedId, items);
          updateFeedsState(info, appState, feedId, lastValidUrl);
          return feedFreshNews;
        })
        .then((newsColl) => {
          updateFreshNews(newsColl, appState);
          if (appState.feeds.refreshingIsNotStarted) {
            appState.feeds.refreshingIsNotStarted = false;
            setTimeout(getFreshNews, 10000, appState, axios, refreshFeeds);
          }
        })
        .catch((err) => {
          if (!err.toString().includes('Refreshing')) {
            const { isExist } = appState.warning.input;
            appState.warning.input.warningMessage = 'No rss found at this URL';
            appState.links.typedLink.isValid = false;
            appState.warning.input.isExist = !isExist;
          }
          throw new Error(err);
        });
    }
  });
};
