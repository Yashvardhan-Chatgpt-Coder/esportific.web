"use client";

import { useEffect, useMemo, useState, type KeyboardEventHandler } from "react";
import { CountryRegionData } from "react-country-region-selector";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { AppSearchSelect } from "@/components/dashboard/AppSearchSelect";

type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

type CountryRecord = [string, string, string];

const DEFAULT_COUNTRY: CountryCode = "IN";
const PRIORITY_COUNTRIES = ["IN", "US", "GB", "AE", "SG", "CA", "AU"];

const countryRegionRecords = (
  Array.isArray(CountryRegionData)
    ? CountryRegionData
    : (CountryRegionData as Record<string, unknown>)?.default ?? []
) as CountryRecord[];

type CountryOption = { name: string; code: CountryCode; callingCode: string };

const countries: CountryOption[] = countryRegionRecords
  .map(([name, code]: CountryRecord) => {
    try {
      return {
        name,
        code: code as CountryCode,
        callingCode: getCountryCallingCode(code as CountryCode),
      };
    } catch {
      return null;
    }
  })
  .filter((country): country is CountryOption =>
    Boolean(country),
  )
  .sort((a: CountryOption, b: CountryOption) => {
    const aPriority = PRIORITY_COUNTRIES.indexOf(a.code);
    const bPriority = PRIORITY_COUNTRIES.indexOf(b.code);
    if (aPriority !== -1 || bPriority !== -1) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }
    return a.name.localeCompare(b.name);
  });

function flagUrl(countryCode: string) {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

function CountryFlag({ code }: { code: string }) {
  return (
    <img
      src={flagUrl(code)}
      alt=""
      loading="lazy"
      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
    />
  );
}

function selectedCountryFromValue(value: string): CountryCode {
  const normalized = value.trim();
  if (!normalized.startsWith("+")) return DEFAULT_COUNTRY;

  const digits = normalized.replace(/[^\d+]/g, "");
  const matched = [...countries]
    .sort((a, b) => b.callingCode.length - a.callingCode.length)
    .find((country: CountryOption) => digits.startsWith(`+${country.callingCode}`));

  return matched?.code ?? DEFAULT_COUNTRY;
}

function localNumberFromValue(value: string, countryCode: CountryCode) {
  const country = countries.find((item: CountryOption) => item.code === countryCode);
  const trimmed = value.trim();
  if (!country || !trimmed.startsWith("+")) return value;

  const withoutCallingCode = trimmed
    .replace(new RegExp(`^\\+${country.callingCode}\\s*`), "")
    .trimStart();

  return withoutCallingCode;
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "98765 43210",
  onKeyDown,
}: PhoneNumberInputProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(() =>
    selectedCountryFromValue(value),
  );
  const selectedCountry = countries.find((country: CountryOption) => country.code === selectedCountryCode);
  const localNumber = localNumberFromValue(value, selectedCountryCode);

  useEffect(() => {
    if (value.trim().startsWith("+")) {
      setSelectedCountryCode(selectedCountryFromValue(value));
    }
  }, [value]);

  const countryOptions = useMemo(
    () =>
      countries.map((country: CountryOption) => ({
        value: country.code,
        label: `${country.name} +${country.callingCode}`,
        icon: <CountryFlag code={country.code} />,
      })),
    [],
  );

  const updateValue = (countryCode: CountryCode, number: string) => {
    setSelectedCountryCode(countryCode);
    const country = countries.find((item: CountryOption) => item.code === countryCode);
    const cleanNumber = number.trimStart();
    if (!country) {
      onChange(cleanNumber);
      return;
    }

    onChange(cleanNumber ? `+${country.callingCode} ${cleanNumber}` : "");
  };

  return (
    <div className="flex gap-2">
      <AppSearchSelect
        value={selectedCountryCode}
        options={countryOptions}
        onChange={(nextCountryCode) => updateValue(nextCountryCode as CountryCode, localNumber)}
        placeholder="Country"
        compact
        className="w-[220px] shrink-0"
      />
      <div className="flex h-[40px] min-w-0 flex-1 items-center overflow-hidden rounded-[8px] border border-[#e2e5ec] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.02)] transition-colors focus-within:border-[#000000]">
        <span className="flex h-full w-[54px] shrink-0 items-center justify-center bg-white text-[14px] font-semibold text-[#000000]">
          +{selectedCountry?.callingCode ?? getCountryCallingCode(DEFAULT_COUNTRY)}
        </span>
        <input
          type="tel"
          data-no-style
          value={localNumber}
          onChange={(event) => updateValue(selectedCountryCode, event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 border-0 bg-white pl-0 pr-3 text-[14px] font-medium text-[#000000] shadow-none outline-none ring-0 placeholder:text-[#b0b7c4] focus:border-0 focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
