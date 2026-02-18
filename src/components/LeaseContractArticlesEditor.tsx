/**
 * Éditeur des 17 articles du contrat de bail
 * Chaque article est modifiable par l'utilisateur
 */

import { useState } from 'react';
import {
  ARTICLE_TITLES,
  getDefaultArticleWithPlaceholders,
} from '../utils/leaseContractArticles';

export type ContractArticlesState = Record<string, string>;

const EMPTY_ARTICLES: ContractArticlesState = {};

export function getDefaultContractArticles(): ContractArticlesState {
  return { ...EMPTY_ARTICLES };
}

interface LeaseContractArticlesEditorProps {
  contractArticles: ContractArticlesState;
  onChange: (articles: ContractArticlesState) => void;
  replacements: {
    property_address: string;
    property_city: string;
    consistance: string;
    equipments: string;
    duration_years: string;
    start_date: string;
    monthly_rent: string;
    payment_due_day: string;
    advance_amount: string;
    deposit_amount: string;
  };
  className?: string;
}

export default function LeaseContractArticlesEditor({
  contractArticles,
  onChange,
  replacements,
  className = '',
}: LeaseContractArticlesEditorProps) {
  const [expandedArticles, setExpandedArticles] = useState<Set<number>>(new Set([1, 2, 6, 8]));

  const toggleArticle = (num: number) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const expandAll = () => setExpandedArticles(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]));
  const collapseAll = () => setExpandedArticles(new Set());

  const getArticleValue = (num: number): string => {
    const custom = contractArticles[String(num)];
    if (custom !== undefined && custom !== '') return custom;
    return getDefaultArticleWithPlaceholders(num);
  };

  const handleArticleChange = (num: number, value: string) => {
    const template = getDefaultArticleWithPlaceholders(num);
    const newArticles = { ...contractArticles };
    if (value === template || value.trim() === '') {
      delete newArticles[String(num)];
    } else {
      newArticles[String(num)] = value;
    }
    onChange(newArticles);
  };

  const resetToDefaults = () => {
    onChange({});
  };

  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{property_address\}\}/g, replacements.property_address)
      .replace(/\{\{property_city\}\}/g, replacements.property_city)
      .replace(/\{\{consistance\}\}/g, replacements.consistance)
      .replace(/\{\{equipments\}\}/g, replacements.equipments)
      .replace(/\{\{duration_years\}\}/g, replacements.duration_years)
      .replace(/\{\{start_date\}\}/g, replacements.start_date)
      .replace(/\{\{monthly_rent\}\}/g, replacements.monthly_rent)
      .replace(/\{\{payment_due_day\}\}/g, replacements.payment_due_day)
      .replace(/\{\{advance_amount\}\}/g, replacements.advance_amount)
      .replace(/\{\{deposit_amount\}\}/g, replacements.deposit_amount);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-gray-600">
          Modifiez les articles selon vos besoins. Utilisez les placeholders (ex: {`{{monthly_rent}}`}) pour les valeurs dynamiques.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Tout développer
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Tout réduire
          </button>
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
          >
            <i className="ri-refresh-line"></i>
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const).map((num) => (
          <div
            key={num}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            <button
              type="button"
              onClick={() => toggleArticle(num)}
              className="w-full flex items-center justify-between px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-900"
            >
              <span>Article {num} : {ARTICLE_TITLES[num]}</span>
              <i
                className={`ri-arrow-down-s-line w-4 h-4 transition-transform ${
                  expandedArticles.has(num) ? '' : '-rotate-90'
                }`}
              />
            </button>
            {expandedArticles.has(num) && (
              <div className="p-3 border-t border-gray-200">
                <textarea
                  value={getArticleValue(num)}
                  onChange={(e) => handleArticleChange(num, e.target.value)}
                  rows={4}
                  placeholder={replacePlaceholders(getDefaultArticleWithPlaceholders(num))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-xs sm:text-sm"
                />
               
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
